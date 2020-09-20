const {SecretManagerServiceClient} = require('@google-cloud/secret-manager');

const name = process.env.TWITTER_API_BEARER_SECRET_LOC;

exports.run = async (req, res) => {
  const client = new SecretManagerServiceClient();

  const [secret] = await client.getSecret({
    name: name,
  });

  const policy = secret.replication.replication;

  console.info(`Found secret ${secret.name} (${policy})`);

  res.send(`we ran!, Policy: ${typeof policy}`);
};
