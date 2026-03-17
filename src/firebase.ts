import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

let app: FirebaseApp;
let db: Firestore;
let auth: Auth;

try {
  if (!firebaseConfig || !firebaseConfig.apiKey || firebaseConfig.apiKey === "TODO_KEYHERE") {
    throw new Error("Configuração do Firebase ausente ou inválida no arquivo firebase-applet-config.json");
  }
  app = initializeApp(firebaseConfig);
  db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
  auth = getAuth(app);
} catch (error) {
  console.error("Erro ao inicializar Firebase:", error);
  // Fallback para evitar crash total imediato, embora a app precise do Firebase
  // @ts-ignore
  app = {} as FirebaseApp;
  // @ts-ignore
  db = {} as Firestore;
  // @ts-ignore
  auth = {} as Auth;
}

export { app, db, auth };

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  // Check for missing index error
  if (errorMessage.includes("The query requires an index")) {
    const indexUrlMatch = errorMessage.match(/https:\/\/console\.firebase\.google\.com[^\s]*/);
    const indexUrl = indexUrlMatch ? indexUrlMatch[0] : null;
    
    if (indexUrl) {
      console.error("Firestore Index Error: ", indexUrl);
      // We can throw a more descriptive error or handle it in the UI
      throw new Error(`Índice necessário para esta consulta. Por favor, clique no link para criar: ${indexUrl}`);
    }
  }

  const errInfo: FirestoreErrorInfo = {
    error: errorMessage,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
