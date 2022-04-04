import { Module, render } from 'viz.js/full.render.js'
import mysql from 'mysql'
import Viz from 'viz.js'
import util from 'util'
import fs from 'fs'

const viz = new Viz({ Module, render })

const tr = (port, data) => `<tr><td port="${port}">${data}</td></tr>`

const table = data => (`
${data.table} [label=<
  <table border="0" cellborder="1" cellspacing="0" cellpadding="2">
    <tr><td port="table" bgcolor="#eeeeee"><b><i>${data.table}</i></b></td></tr>
    ${data.columns.map(c => tr(c.field, `${c.field}: ${c.type}`)).join('\n')}
  </table>
>];
`)

const graph = data => (`
digraph {
  graph [pad="0.5", nodesep="0.5", ranksep="2"];
  node [shape=plain]
  rankdir=LR;

  ${data.map(t => table(t)).join('\n')}
  ${data.map(t => t.keys.map(f => `${f.table}:${f.column} -> ${f.references.table}:${f.references.column};`).join('\n')).join('')}
}
`)

export default (database, user = 'root', password) => {
  const connection = mysql.createConnection({
    database,
    password,
    user,
  })
  connection.connect()

  const query = util.promisify(connection.query).bind(connection)

  query('SHOW tables')
    .then(tables => tables.map(t => Object.values(t)).flat())
    .then(tables =>
      Promise.all(
        tables.map(
          table => query(`DESCRIBE ${table}`)
            .then(columns =>
              columns.map(
                column => Object.entries(column).reduce((c, [k, v]) => ({
                  ...c,
                  [k.toLowerCase()]: v
                }), {})
              )
            )
            .then(columns => ({
              table,
              columns
            }))
            .then(s =>
              query(
                'SELECT * FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE ' +
                'WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = ?',
                [table]
              ).then(keys =>
                ({
                ...s,
                keys: keys.reduce((k, v) => {
                  if (v.REFERENCED_TABLE_NAME) {
                    k.push({
                      table: v.TABLE_NAME,
                      column: v.COLUMN_NAME,
                      references: {
                        table: v.REFERENCED_TABLE_NAME,
                        column: v.REFERENCED_COLUMN_NAME
                      }
                    })
                  }

                  return k
                }, [])
              }))
            )
        )
      )
    )
    .then(data => graph(data))
    .then(data => viz.renderString(data, { engine: 'dot', format: 'svg' }))
    .then(data => fs.writeFileSync(`./${database}.svg`, data))
    .catch(console.error)
    .then(() => connection.end())
    .then(() => process.exit(0))
}
