import JiraClient from 'jira-connector';

export interface JiraFieldMeta {
    id: string;
    custom_id: number;
    name: string;
    java_type: string;
    type: string;
    is_custom: boolean;
}

export interface JiraFieldMarkedMeta extends JiraFieldMeta{
  target_name: string;
}

export interface JiraFieldMetas {
    [key: string] : JiraFieldMeta;
}

export const jiraGetAllFieldMetas = async (jira: JiraClient) => {
    const allFields0 = await jira.field.getAllFields(); // {'customfield_10374' }

    const allFields = {} as JiraFieldMetas;
    for(let field of allFields0) {
        allFields[field.id] = {
            is_custom: field.custom,
            id: field.id,
            name: field.name,
            custom_id: field.schema && field.schema.custom_id,
            java_type: field.schema && field.schema.custom,
            type: field.schema && field.schema.type,
        };
    }
    return allFields;    
}