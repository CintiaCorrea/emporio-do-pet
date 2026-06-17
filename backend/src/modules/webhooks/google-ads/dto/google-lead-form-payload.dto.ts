/**
 * Payload enviado pelo Google Ads Lead Form (webhook).
 * Docs: https://support.google.com/google-ads/answer/9023941
 *
 * Os dados do formulário vêm em `user_column_data`, cada item com
 * `column_id` (FULL_NAME, EMAIL, PHONE_NUMBER, etc.) e `string_value`.
 */
export interface GoogleLeadUserColumn {
  column_id?: string;
  column_name?: string;
  string_value?: string;
}

export interface GoogleLeadFormPayload {
  lead_id?: string;
  api_version?: string;
  form_id?: number | string;
  campaign_id?: number | string;
  adgroup_id?: number | string;
  creative_id?: number | string;
  gcl_id?: string;
  google_key?: string;
  is_test?: boolean;
  user_column_data?: GoogleLeadUserColumn[];
  // tolera chaves extras
  [key: string]: unknown;
}
