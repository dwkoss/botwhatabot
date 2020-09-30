const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const Twit = require('twit');

const twitterKeyLoc = process.env.TWITTER_API_KEY_LOC;
const twitterSecretLoc = process.env.TWITTER_API_SECRET_LOC;
const twitterAccessTokenLoc = process.env.TWITTER_ACCESS_TOKEN_LOC;
const twitterAccessTokenSecretLoc = process.env.TWITTER_ACCESS_TOKEN_SECRET_LOC;

const getFromSecretManager = async (client, name) => {
  const [version] = await client.accessSecretVersion({
    name: `${name}/versions/latest`,
  });
  return version.payload.data.toString();
};

const democratText = ['biden', 'democrats', 'dems', 'democrat'];
const republicanText = ['trump', 'republicans', 'republican'];

/* searchRightForExtraText: false is left, true is right */
const searchForButWhatAboutTweets = async (client, extraText, searchRightForExtraText) => {
  const twitResponse = await client.get('search/tweets', {
    q: `${extraText} "but what about"`, count: 100, tweet_mode: 'extended', result_type: 'recent',
  });

  // Remember that twitter search captures retweet text, so we have to actually check by hand.
  return twitResponse.data.statuses
    .filter((status) => status.truncated === false)
    .map((status) => {
      if (!status.retweeted_status) {
        return status.full_text;
      }
      return status.retweeted_status.full_text;
    })
    .filter((text) => {
      const lowerCaseText = text.toLowerCase();
      const butWhatAboutLoc = lowerCaseText.search('but what about');
      const extraTextLoc = lowerCaseText.search(extraText);

      return butWhatAboutLoc >= 0
        && extraTextLoc >= 0
        && (searchRightForExtraText
          ? extraTextLoc < butWhatAboutLoc
          : butWhatAboutLoc < extraTextLoc);
    });
};

const splitTextByButWhatAbout = (tweet) => {
  const lowerCaseTweet = tweet.toLowerCase();
  const butWhatAboutLoc = lowerCaseTweet.search('but what about');
  return [lowerCaseTweet.substring(0, butWhatAboutLoc), lowerCaseTweet.substring(butWhatAboutLoc)];
};

const constructTweetText = (leftCollectionOfSplits, rightCollecitonOfSplits) => {
  const leftText = leftCollectionOfSplits
    .filter((split) => split[0].length > 50 && split[0].length < 140
      && split[1].length > 50 && split[1].length < 140);
  const rightText = rightCollecitonOfSplits
    .filter((split) => split[1].length > 50 && split[1].length < 140
      && split[1].length > 50 && split[1].length < 140);

  console.log('number of valid lefts', leftText.length);
  console.log('number of valid rights', rightText.length);
  console.log('leftText', leftText[0][0]);
  console.log('rightText', rightText[0][1]);

  return leftText[0][0] + rightText[0][1];
};

exports.run = async (req, res) => {
  let parsedBody;

  // https://stackoverflow.com/questions/53216177/http-triggering-cloud-function-with-cloud-scheduler
  // tl;dr - If cloud scheduler executes via post request, the content type is not set
  // to application/json, so we need to manually parse the request body
  if (req.header('content-type') === 'application/json') {
    console.log('request header content-type is application/json and auto parsing the req body as json');
    parsedBody = req.body;
  } else {
    console.log('request header content-type is NOT application/json and MANUALLY parsing the req body as json');
    parsedBody = JSON.parse(req.body);
  }

  // This is where original content begins :)
  const secretManagerClient = new SecretManagerServiceClient();

  const consumerKey = await getFromSecretManager(secretManagerClient, twitterKeyLoc);
  const consumerSecret = await getFromSecretManager(secretManagerClient, twitterSecretLoc);
  const accessToken = await getFromSecretManager(secretManagerClient, twitterAccessTokenLoc);
  const accessTokenSecret = await getFromSecretManager(
    secretManagerClient, twitterAccessTokenSecretLoc,
  );

  const randomDemocratText = democratText[Math.floor(Math.random() * democratText.length)];
  const randomRepublicanText = republicanText[Math.floor(Math.random() * republicanText.length)];

  const twitClient = new Twit({
    consumer_key: consumerKey,
    consumer_secret: consumerSecret,
    access_token: accessToken,
    access_token_secret: accessTokenSecret,
  });

  const demFirst = Math.random() * 2 > 1;

  const democratTweets = await searchForButWhatAboutTweets(
    twitClient,
    randomDemocratText,
    demFirst,
  );
  const republicanTweets = await searchForButWhatAboutTweets(
    twitClient,
    randomRepublicanText,
    !demFirst,
  );

  const splitDemText = democratTweets.map((tweet) => splitTextByButWhatAbout(tweet));
  const splitRepubText = republicanTweets.map((tweet) => splitTextByButWhatAbout(tweet));

  const tweetText = demFirst
    ? constructTweetText(splitDemText, splitRepubText)
    : constructTweetText(splitRepubText, splitDemText);
  if (parsedBody.noExecuteTweet) {
    res.send({
      tweetText,
    });
  } else {
    const tweetResponse = await twitClient.post('statuses/update', { status: tweetText });
    console.log(tweetResponse);

    res.send({
      tweetText,
      tweetResponse,
    });
  }
};
