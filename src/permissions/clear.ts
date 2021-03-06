import pg = require("pg");
import * as psy from "psychopiggy";
import {
  ErrorResult,
  ICallContext,
  parseServiceResult,
  ServiceResult,
  ValidResult
} from "scuttlespace-service-common";
import { getPool } from "../pool";
import { findUser } from "../user/get";
import { getPermissionsForUser } from "./get";

export async function clearPermissions(
  module: string,
  assigneeExternalId: string,
  assignerExternalId: string,
  context: ICallContext
): Promise<ServiceResult<{ username: string }>> {
  const pool = getPool();
  const maybeUser = await parseServiceResult(
    findUser({ externalId: assignerExternalId }, context)
  );

  return maybeUser
    ? await (async () => {
        const maybePermissions = await parseServiceResult(
          getPermissionsForUser(assigneeExternalId, assignerExternalId, context)
        );
        return !maybePermissions
          ? new ValidResult({ username: maybeUser.username })
          : await (async () => {
              const updationParams = new psy.Params({
                assignee_external_id: assigneeExternalId,
                assigner_external_id: assignerExternalId,
                permissions: (typeof maybePermissions !== "undefined"
                  ? maybePermissions.permissions
                  : []
                )
                  .filter(x => x.module !== module)
                  .map(x => `${x.module}:${x.permission}`)
                  .sort()
                  .join(",")
              });

              await pool.query(
                `
                  UPDATE user_permissions SET permissions=${updationParams.id(
                    "permissions"
                  )}
                  WHERE 
                    assignee_external_id = ${updationParams.id(
                      "assignee_external_id"
                    )} AND 
                    assigner_external_id = ${updationParams.id(
                      "assigner_external_id"
                    )}
                `,
                updationParams.values()
              );
              return new ValidResult({ username: maybeUser.username });
            })();
      })()
    : new ErrorResult({
        code: "NO_ACCOUNT",
        message: `${assignerExternalId} does not have an user. Create an user first.`
      });
}
