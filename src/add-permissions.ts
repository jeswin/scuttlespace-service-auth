import pg = require("pg");
import * as psy from "psychopiggy";
import * as errors from "./errors";
import exception from "./exception";
import { ICallContext } from "./types";

export default async function addPermissions(
  username: string,
  assigneeNetworkId: string,
  callerNetworkId: string,
  permissions: string[],
  pool: pg.Pool,
  context: ICallContext
): Promise<void> {
  const accountQueryParams = new psy.Params({
    network_id: callerNetworkId,
    username
  });
  const { rows: accountRows } = await pool.query(
    `
    SELECT * FROM account 
    WHERE 
      username = ${accountQueryParams.id("username")} AND 
      network_id = ${accountQueryParams.id("network_id")}`,
    accountQueryParams.values()
  );

  if (accountRows.length === 1) {
    const permissionsQueryParams = new psy.Params({
      network_id: assigneeNetworkId,
      username
    });
    const { rows: permissionsRows } = await pool.query(
      `
      SELECT * FROM account_permissions
      WHERE 
        username = ${permissionsQueryParams.id("username")} AND 
        network_id = ${permissionsQueryParams.id("network_id")}`,
      permissionsQueryParams.values()
    );

    const insertionParams = new psy.Params({
      network_id: assigneeNetworkId,
      permissions: permissions.join(","),
      username
    });
    if (permissionsRows.length === 0) {
      await pool.query(
        `
        INSERT INTO account_permissions (${insertionParams.columns()})
        VALUES (${insertionParams.ids()})
      `,
        insertionParams.values()
      );
    } else if (permissionsRows.length === 1) {
      const updationParams = new psy.Params({
        network_id: assigneeNetworkId,
        permissions: permissions.join(","),
        username
      });
      await pool.query(
        `
        UPDATE account_permissions SET permissions=${updationParams.id(
          "permissions"
        )}
        WHERE 
          username = ${updationParams.id("username")} AND 
          network_id = ${updationParams.id("network_id")}
      `,
        updationParams.values()
      );
    } else {
      errors.singleOrNone(permissionsRows);
    }
  } else if (accountRows.length === 0) {
    exception(
      "NO_MANAGE_PERMISSION",
      `${callerNetworkId} cannot manage permissions for username ${username}.`,
      context.trace
    );
  } else {
    errors.singleOrNone(accountRows);
  }
}
