export const unused32904 = 0;
// TODO Migration.ts - изменение состава загружаемых полей
// - Миграция должна проходить по комманде, а не сама по себе!
//     - При запуске миграции копируем данные из jira_fields в dont_touch__jira_fields
//         - Функция makeCreateIssueTableSql
//         - Функция makeMigrateIssueSql
//         - В транзакиции
//             - Дропаем temp jira_issues_changes
//             - Проверяем что jira_issues_old не существует, иначе падаем
//             - Переименовываем старые jira_issues в jira_issues_old
//             - Вызываем makeCreateIssueTableSql
//             - Вызываем makeMigrateIssueSql
//             - Проверяем что count равен
//             - Дропаем jira_issues_old
//         - Вызываем makeMergeProc для новых jira_issues и jira_issues_changes
//     - deploy_schema_for_issues
//         makeMergeProc -> handle_jira_issues_changes
//     - Не должно быть возможности параллельного запуска с загрузками порций Jira в базу

