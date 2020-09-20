const {SecretManagerServiceClient} = require('@google-cloud/secret-manager');

const name = process.env.TWITTER_API_BEARER_SECRET_LOC;

exports.run = async (req, res) => {
  const client = new SecretManagerServiceClient();

  const [version] = await client.accessSecretVersion({
    name: name,
  });

  // Extract the payload as a string.
  const payload = version.payload.data.toString();

  // WARNING: Do not print the secret in a production environment - this
  // snippet is showing how to access the secret material.
  console.info(`Payload: ${typeof payload}`);

  res.send(`we ran!, Payload: ${typeof payload}`);
};
