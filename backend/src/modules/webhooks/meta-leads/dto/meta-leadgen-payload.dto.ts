/**
 * Payloads do Meta Lead Ads (webhook leadgen) e do detalhe do lead.
 * Docs: https://developers.facebook.com/docs/marketing-api/guides/lead-ads/retrieving
 *
 * O webhook NÃO traz os dados do formulário — só o `leadgen_id`. O serviço
 * busca os campos chamando a Graph API: GET /{leadgen_id}?fields=field_data,...
 */

/** Notificação que o Meta envia no POST do webhook. */
export interface MetaLeadgenChangeValue {
  leadgen_id?: string;
  page_id?: string;
  form_id?: string;
  adgroup_id?: string;
  ad_id?: string;
  created_time?: number;
}

export interface MetaLeadgenChange {
  field?: string; // 'leadgen'
  value?: MetaLeadgenChangeValue;
}

export interface MetaLeadgenEntry {
  id?: string; // page_id
  time?: number;
  changes?: MetaLeadgenChange[];
}

export interface MetaLeadgenPayload {
  object?: string; // 'page'
  entry?: MetaLeadgenEntry[];
  // tolera chaves extras
  [key: string]: unknown;
}

/** Resposta da Graph API ao buscar o lead pelo leadgen_id. */
export interface MetaLeadFieldDatum {
  name?: string; // full_name, email, phone_number, etc.
  values?: string[];
}

export interface MetaLeadDetail {
  id?: string;
  created_time?: string;
  ad_id?: string;
  ad_name?: string;
  form_id?: string;
  campaign_id?: string;
  campaign_name?: string;
  platform?: string; // 'fb' | 'ig'
  field_data?: MetaLeadFieldDatum[];
  // tolera chaves extras
  [key: string]: unknown;
}
