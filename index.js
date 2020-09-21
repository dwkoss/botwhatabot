const {SecretManagerServiceClient} = require('@google-cloud/secret-manager');
const Twit = require('twit');

const twitterKeyLoc = process.env.TWITTER_API_KEY_LOC;
const twitterSecretLoc = process.env.TWITTER_API_SECRET_LOC;

const getFromSecretManager = async (client, name) => {
  const [version] = await client.accessSecretVersion({
    name: `${name}/versions/latest`,
  });
  return version.payload.data.toString();
};

exports.run = async (req, res) => {
  const secretManagerClient = new SecretManagerServiceClient();

  const key = await getFromSecretManager(secretManagerClient, twitterKeyLoc);
  const secret = await getFromSecretManager(secretManagerClient, twitterSecretLoc);

  const twitClient = new Twit({
    consumer_key: key,
    consumer_secret: secret,
    app_only_auth: true
  });

  twitClient.get('search/tweets', { q: 'trump "but what about"', count: 5 }, function(err, data, response) {
    console.log(data);
    res.send(data);
  });
};
