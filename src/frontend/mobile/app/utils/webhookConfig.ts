// src/utils/webhookConfig.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

// 🔐 WEBHOOK KONFIGURATION UTILITIES
// Zentrale Verwaltung der Webhook-Einstellungen für die gesamte App

export interface WebhookConfig {
  selectedProfile: string;
  baseUrl: string;
  apiKey: string;
  authToken: string;
}

// 📋 STORAGE SCHLÜSSEL
export const WEBHOOK_STORAGE_KEYS = {
  selectedProfile: 'webhook_selected_profile',
  editableBaseUrl: 'webhook_editable_base_url',
  editableApiKey: 'webhook_editable_api_key',
  editableAuthToken: 'webhook_editable_auth_token',
};

// 🏭 STANDARD WEBHOOK-PROFILE
export const DEFAULT_WEBHOOK_PROFILES = {
  production: {
    name: "🟢 Production (Cloudforming)",
    baseUrl: "https://n8n.cloudforming.de/webhook",
    apiKey: "cf-prod-2024-secure-key",
    authToken: "Bearer cf-auth-token-prod",
    description: "Produktive Umgebung für Live-Webhooks",
  },
  staging: {
    name: "🟡 Staging (Test)",
    baseUrl: "https://staging.n8n.cloudforming.de/webhook",
    apiKey: "cf-staging-2024-test-key",
    authToken: "Bearer cf-auth-token-staging",
    description: "Test-Umgebung für Entwicklung",
  },
  development: {
    name: "🟠 Development (Local)",
    baseUrl: "http://localhost:5678/webhook",
    apiKey: "dev-local-key",
    authToken: "Bearer dev-local-token",
    description: "Lokale Entwicklungsumgebung",
  },
  custom: {
    name: "🔧 Benutzerdefiniert",
    baseUrl: "",
    apiKey: "",
    authToken: "",
    description: "Eigene Webhook-Konfiguration",
  },
};

/**
 * 📥 Aktuelle Webhook-Konfiguration laden
 * Lädt die gespeicherten Werte aus AsyncStorage und gibt die vollständige Konfiguration zurück
 */
export const getWebhookConfig = async (): Promise<WebhookConfig> => {
  try {
    const [selectedProfile, editableBaseUrl, editableApiKey, editableAuthToken] = await Promise.all([
      AsyncStorage.getItem(WEBHOOK_STORAGE_KEYS.selectedProfile),
      AsyncStorage.getItem(WEBHOOK_STORAGE_KEYS.editableBaseUrl),
      AsyncStorage.getItem(WEBHOOK_STORAGE_KEYS.editableApiKey),
      AsyncStorage.getItem(WEBHOOK_STORAGE_KEYS.editableAuthToken),
    ]);

    // Standard-Profil falls nichts gespeichert ist
    const profileKey = selectedProfile || 'production';
    const defaultProfile = DEFAULT_WEBHOOK_PROFILES[profileKey as keyof typeof DEFAULT_WEBHOOK_PROFILES];

    return {
      selectedProfile: profileKey,
      baseUrl: editableBaseUrl || defaultProfile.baseUrl,
      apiKey: editableApiKey || defaultProfile.apiKey,
      authToken: editableAuthToken || defaultProfile.authToken,
    };
  } catch (error) {
    console.error('❌ Fehler beim Laden der Webhook-Konfiguration:', error);
    
    // Fallback auf Production-Profil
    const productionProfile = DEFAULT_WEBHOOK_PROFILES.production;
    return {
      selectedProfile: 'production',
      baseUrl: productionProfile.baseUrl,
      apiKey: productionProfile.apiKey,
      authToken: productionProfile.authToken,
    };
  }
};

/**
 * 🔍 Vollständige URL für spezifischen Webhook-Endpunkt erstellen
 * @param endpoint - Der spezifische Endpunkt (z.B. "/content-idee-generator")
 * @returns Vollständige URL mit Base URL
 */
export const buildWebhookUrl = async (endpoint: string): Promise<string> => {
  const config = await getWebhookConfig();
  
  // Stelle sicher, dass der Endpunkt mit "/" beginnt
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  // Base URL ohne trailing slash + Endpunkt
  const baseUrl = config.baseUrl.replace(/\/$/, '');
  
  return `${baseUrl}${cleanEndpoint}`;
};

/**
 * 📋 HTTP-Headers mit Authentifizierung erstellen
 * @param additionalHeaders - Zusätzliche Headers (optional)
 * @returns Headers-Object mit Authentifizierung
 */
export const getWebhookHeaders = async (additionalHeaders: Record<string, string> = {}): Promise<Record<string, string>> => {
  const config = await getWebhookConfig();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...additionalHeaders,
  };

  // API Key hinzufügen falls vorhanden
  if (config.apiKey) {
    headers['X-API-Key'] = config.apiKey;
  }

  // Auth Token hinzufügen falls vorhanden
  if (config.authToken) {
    headers['Authorization'] = config.authToken;
  }

  return headers;
};

/**
 * 🚀 Komplette Webhook-Request-Funktion
 * @param endpoint - Der Webhook-Endpunkt
 * @param data - Die zu sendenden Daten
 * @param method - HTTP-Methode (default: POST)
 * @returns Fetch Response
 */
export const sendWebhookRequest = async (
  endpoint: string, 
  data: any, 
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'POST'
): Promise<Response> => {
  const url = await buildWebhookUrl(endpoint);
  const headers = await getWebhookHeaders();

  const requestOptions: RequestInit = {
    method,
    headers,
  };

  // Body nur bei POST/PUT hinzufügen
  if (method === 'POST' || method === 'PUT') {
    requestOptions.body = JSON.stringify(data);
  }

  console.log(`🔗 Webhook Request: ${method} ${url}`);
  console.log('📋 Headers:', headers);
  console.log('📦 Data:', data);

  return fetch(url, requestOptions);
};