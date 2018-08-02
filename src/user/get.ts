import pg = require("pg");
import * as psy from "psychopiggy";
import {
  ICallContext,
  ServiceResult,
  ValidResult
} from "scuttlespace-api-common";
import { getPool } from "../pool";
import exception from "../exception";

export interface IGetUserResult {
  about: string;
  domain: string;
  enabled: boolean;
  externalId: string;
  username: string;
}

export interface IFindUserArgs {
  domain?: string;
  externalId?: string;
  username?: string;
}

export async function findUser(
  args: IFindUserArgs,
  context: ICallContext
): Promise<ServiceResult<IGetUserResult | undefined>> {
  const pool = getPool();
  return args.domain
    ? await getUserByDomain(args.domain, context)
    : args.username
      ? await getUserByUsername(args.username, context)
      : args.externalId
        ? await getUserByExternalId(args.externalId, context)
        : exception(
            "INVALID_ARGS",
            `One of username, domain or externalId needs to be specified.`
          );
}

export async function getUserByExternalId(
  externalId: string,
  context: ICallContext
): Promise<ServiceResult<IGetUserResult | undefined>> {
  const pool = getPool();
  const params = new psy.Params({ external_id: externalId });
  const { rows } = await pool.query(
    `SELECT * FROM scuttlespace_user
     WHERE external_id = ${params.id("external_id")}`,
    params.values()
  );

  const result: IGetUserResult | undefined =
    rows.length > 0
      ? {
          about: rows[0].about,
          domain: rows[0].domain,
          enabled: rows[0].enabled,
          externalId,
          username: rows[0].username
        }
      : undefined;

  return new ValidResult(result);
}

export async function getUserByDomain(
  domain: string,
  context: ICallContext
): Promise<ServiceResult<IGetUserResult | undefined>> {
  const pool = getPool();
  const params = new psy.Params({ domain });
  const { rows } = await pool.query(
    `SELECT * FROM scuttlespace_user
     WHERE domain = ${params.id("domain")}`,
    params.values()
  );

  const result: IGetUserResult | undefined =
    rows.length > 0
      ? {
          about: rows[0].about,
          domain: rows[0].domain,
          enabled: rows[0].enabled,
          externalId: rows[0].external_id,
          username: rows[0].username
        }
      : undefined;

  return new ValidResult(result);
}

export async function getUserByUsername(
  username: string,
  context: ICallContext
): Promise<ServiceResult<IGetUserResult | undefined>> {
  const pool = getPool();
  const params = new psy.Params({ username });
  const { rows } = await pool.query(
    `SELECT * FROM scuttlespace_user
     WHERE username = ${params.id("username")}`,
    params.values()
  );

  const result: IGetUserResult | undefined =
    rows.length > 0
      ? {
          about: rows[0].about,
          domain: rows[0].domain,
          enabled: rows[0].enabled,
          externalId: rows[0].external_id,
          username
        }
      : undefined;

  return new ValidResult(result);
}
