import 'dotenv/config';

import * as joi from 'joi';

interface EnvVars {
  PORT: number;
  NATS_SERVERS: string;
  DB_HOST: string;
  DB_PORT: number;
  DB_USERNAME: string;
  DB_PASSWORD: string;
  DB_NAME: string;
  MAIL_USERNAME: string;
  MAIL_PASSWORD: string;
  MAIL_HOST: string;
}

const envsSchema = joi
  .object({
    PORT: joi.number().required(),
    NATS_SERVERS: joi.string().required(),
    DB_HOST: joi.string().required(),
    DB_PORT: joi.number().required(),
    DB_USERNAME: joi.string().required(),
    DB_PASSWORD: joi.string().required(),
    DB_NAME: joi.string().required(),
    MAIL_USERNAME: joi.string().required(),
    MAIL_PASSWORD: joi.string().required(),
    MAIL_HOST: joi.string().required(),
  })
  .unknown(true);

const { error, value } = envsSchema.validate({
  ...process.env,
});

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

const envVars: EnvVars = value;

export const envs = {
  PORT: envVars.PORT,
  NATS_SERVERS: envVars.NATS_SERVERS,
  DB_HOST: envVars.DB_HOST,
  DB_PORT: envVars.DB_PORT,
  DB_USERNAME: envVars.DB_USERNAME,
  DB_PASSWORD: envVars.DB_PASSWORD,
  DB_NAME: envVars.DB_NAME,
  MAIL_USERNAME: envVars.MAIL_USERNAME,
  MAIL_PASSWORD: envVars.MAIL_PASSWORD,
  MAIL_HOST: envVars.MAIL_HOST,
};
