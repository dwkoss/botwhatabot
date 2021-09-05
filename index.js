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
// `(${['trump', 'republicans', 'republican', '@POTUS', 'supremacists', 'conservatives', 'mcconnell', 'maga', 'pence'].join(' OR ')}) "but what about"`
const democratSearchKeywords = ['biden', 'democrats', 'dems', 'democrat', 'obama', 'antifa', 'libs', 'liberals', 'clinton', 'pelosi', 'harris', 'blm', 'california', 'aoc', 'nyc', 'JoeBiden', 'dnc'];
const republicanSearchKeywords = ['trump', 'republicans', 'republican', '@POTUS', 'supremacists', 'conservatives', 'mcconnell', 'maga', 'pence', 'texas', 'desantis', 'covid', 'COVID19', 'florida', 'deathsantis', 'rnc', 'maga', 'gop'];

const getBotMostRecentTweetId = async (client) => {
  const botTweets = await client.get('statuses/user_timeline', { screen_name: 'botwotabot', count: 1 });
  // console.log('got bot tweets: ', botTweets);
  console.log('most recent bot tweet is', botTweets.data[0].id);
  return botTweets.data[0].id;
};

const searchForButWhatAboutTweets = async (client, /*sinceStatusId,*/ orText) => {
  console.log('this is the orText', orText);
  const twitResponse = await client.get('search/tweets', {
    q: `"but what about" (${orText.join(' OR ')})`, count: 100, tweet_mode: 'extended', result_type: 'mixed', /*since_id: sinceStatusId,*/
  });
  console.log('query is', `"but what about" (${orText.join(' OR ')})`);

  console.log('num statuses returned', twitResponse.data.statuses.length);

  // console.log('twitResponse', twitResponse);
  // Remember that twitter search captures retweet text, as well as your own text,
  // so we have to filter that out.
  return twitResponse.data.statuses
    .filter((status) => status.truncated === false && status.user.screen_name !== 'botwotabot' && !status.retweeted_status)
    .map((status) => status.full_text)
    .filter((text) => text.toLowerCase().search('but what about') >= 0);
};

const splitTextByButWhatAbout = (tweet) => {
  const lowerCaseTweet = tweet.toLowerCase();
  const butWhatAboutLoc = lowerCaseTweet.search('but what about');
  return [lowerCaseTweet.substring(0, butWhatAboutLoc), lowerCaseTweet.substring(butWhatAboutLoc)];
};

const findValidTextWithKeyword = (searchResultText, searchKeywords) => searchResultText
  // removes text less than 25 chars in length, more than 125
  .filter((text) => text.length > 25 && text.length < 125)
  // find first where the text has at least one search keyword
  .map((text) => ({
    text,
    keyword: searchKeywords.find((searchKeyword) => text.search(searchKeyword) > -1)
  }))
  // returns first where there's a matching keyword
  .find((textAndKeyword) => textAndKeyword.keyword);

const constructValidTweet = (democratTweets, republicanTweets, demFirst) => {
  const splitDemText = democratTweets.map((tweet) => splitTextByButWhatAbout(tweet));
  const splitRepubText = republicanTweets.map((tweet) => splitTextByButWhatAbout(tweet));

  const firstDemTextWithKeyword = findValidTextWithKeyword((demFirst
    ? splitDemText.map((split) => split[0])
    : splitDemText.map((split) => split[1])),
  democratSearchKeywords.sort(() => Math.random() - 0.5));

  const firstRepublicanTextWithKeyword = findValidTextWithKeyword(demFirst
    ? splitRepubText.map((split) => split[1])
    : splitRepubText.map((split) => split[0]),
  republicanSearchKeywords.sort(() => Math.random() - 0.5));

  if (!firstDemTextWithKeyword || !firstRepublicanTextWithKeyword) {
    console.log('unable to create a tweet because not enough valid data');
    return null;
  }
  const hashTags = `#${firstDemTextWithKeyword.keyword} #${firstRepublicanTextWithKeyword.keyword} #politics #vote`;

  const tweetText = demFirst
    ? `${firstDemTextWithKeyword.text} ${firstRepublicanTextWithKeyword.text} ${hashTags}`
    : `${firstRepublicanTextWithKeyword.text} ${firstDemTextWithKeyword.text} ${hashTags}`

  console.log('final tweet text', tweetText);

  return tweetText;
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

  const twitClient = new Twit({
    consumer_key: consumerKey,
    consumer_secret: consumerSecret,
    access_token: accessToken,
    access_token_secret: accessTokenSecret,
  });

  // const mostRecentBotTweetId = await getBotMostRecentTweetId(twitClient);

  const democratTweets = await searchForButWhatAboutTweets(
    twitClient,
    mostRecentBotTweetId,
    democratSearchKeywords,
  );
  const republicanTweets = await searchForButWhatAboutTweets(
    twitClient,
    mostRecentBotTweetId,
    republicanSearchKeywords,
  );

  console.log('number of democrat tweets returned', democratTweets.length);
  console.log('number of republican tweets returned', republicanTweets.length);

  const demFirst = Math.random() * 2 > 1;
  const tweetText = constructValidTweet(democratTweets, republicanTweets, demFirst)
    || constructValidTweet(democratTweets, republicanTweets, !demFirst);
  if (!tweetText) {
    console.log('no tweet was generated because there were not enough valid tweets');
    res.send({
      tweetText: null,
    });
  } else if (parsedBody.noExecuteTweet) {
    res.send({
      tweetText,
    });
  } else {
    let tweetResponse;
    try {
      tweetResponse = await twitClient.post('statuses/update', { status: tweetText });

      console.log ({
        tweetText,
        tweetResponse,
      });

      res.send({
        tweetText,
        tweetResponse,
      });
    } catch (e) {
      console.log(e);
    }
  }
};
