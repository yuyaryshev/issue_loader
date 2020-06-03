module.exports = {
    requests: {
        "GET /rest/api/2/serverInfo QI4mz4bRUoHc00M7dSz3LZoU06TjjEMsYFQ4l548puA": {
            request: {
                method: "GET",
                url: "/rest/api/2/serverInfo",
                query: {},
                data: undefined,
                headers: {
                    host: "localhost:4000",
                    authorization: "Basic VV9NMTJZSzpMb0AxMjEzNTEwNA==",
                    accept: "application/json",
                    connection: "close",
                },
            },
            response: {
                body:
                    '{"baseUrl":"http://jira.moscow.alfaintra.net","version":"8.5.3","versionNumbers":[8,5,3],"deploymentType":"Server","buildNumber":805003,"buildDate":"2020-01-09T00:00:00.000+0300","databaseBuildNumber":805003,"serverTime":"2020-03-11T19:18:34.876+0300","scmInfo":"b4933e02eaff29a49114274fe59e1f99d9d963d7","serverTitle":"Alfa-bank Issue Tracker"}',
                headers: {
                    server: "nginx",
                    date: "Wed, 11 Mar 2020 16:18:34 GMT",
                    "content-type": "application/json;charset=UTF-8",
                    connection: "close",
                    "x-arequestid": "1158x1253552x2",
                    "x-anodeid": "jira_node_atlapg.moscow.alfaintra.net",
                    "x-xss-protection": "1; mode=block",
                    "x-content-type-options": "nosniff",
                    "x-frame-options": "SAMEORIGIN",
                    "content-security-policy": "frame-ancestors 'self'",
                    "x-asen": "SEN-12281853",
                    "set-cookie": [
                        "JSESSIONID=2F77F2096F0AB070C2B95A736D43E810; Path=/; HttpOnly",
                        "atlassian.xsrf.token=BXMG-7PLC-PE42-MECF_31ca860a301f7366ab3546c7589bf36e295f2624_lin; Path=/",
                        "BIGipServer~DMZ_IntService~jira_pool=!yi/jFcFN7NJlMCzbfaSvGhRzAncvDJR6G5o8TTiGYVOL7VN8nr3T0HBsnlZ+jDdZUEHTeZ1eDfgJj8kkqkPaoJ2rgQto5kcSMNQRwVk=; path=/; Httponly",
                    ],
                    "x-seraph-loginreason": "OK",
                    "x-asessionid": "1exzmx2",
                    "x-ausername": "U_M12YK",
                    "cache-control": "no-cache, no-store, no-transform",
                },
                statusCode: 200,
            },
        },
    },
};
