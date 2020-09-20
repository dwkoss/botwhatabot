const {SecretManagerServiceClient} = require('@google-cloud/secret-manager');

const name = process.env.TWITTER_API_BEARER_SECRET_LOC;

exports.run = async (req, res) => {
  const client = new SecretManagerServiceClient();

  const [secret] = await client.getSecret({
    name: `${name}/versions/latest`,
  });

  const payload = version.payload.data.toString();

  res.send(`we ran!, found a policy with a type: ${typeof payload}`);
};
