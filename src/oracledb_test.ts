// myscript.js
// This example uses Node 8's async/await syntax.

import oracledb from 'oracledb';

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

const mypw = "Lo@12135102";  // set mypw to the hr schema password

async function run() {

  let connection;

  try {
    connection = await oracledb.getConnection(  {
      user          : "YYARYSHEV",
      password      : mypw,
      connectString : "DWSTPROD_TAF"
    });

    const result = await connection.execute(
        `SELECT 1453 a, :id b from dual`,
        [103],  // bind value for :id
      );
  
    // const result = await connection.execute(
    //   `SELECT manager_id, department_id, department_name
    //    FROM departments
    //    WHERE manager_id = :id`,
    //   [103],  // bind value for :id
    // );
    console.log(result.rows);

  } catch (err) {
    console.error(err);
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error(err);
      }
    }
  }
}

run();