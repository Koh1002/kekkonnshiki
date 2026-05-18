import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";

// サーバーサイド専用。API Routes / Server Components からのみ利用。
let _db: Firestore | undefined;

export function adminDb(): Firestore {
  if (_db) return _db;

  if (!getApps().length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!raw) {
      throw new Error(
        "FIREBASE_SERVICE_ACCOUNT_KEY が設定されていません。Firebase Console からサービスアカウント JSON を取得して環境変数に貼り付けてください。"
      );
    }
    let parsed: Record<string, string>;
    try {
      // Vercel 環境変数に貼り付けた JSON を直接 parse
      parsed = JSON.parse(raw);
    } catch {
      throw new Error(
        "FIREBASE_SERVICE_ACCOUNT_KEY が有効な JSON ではありません。JSON 文字列を1行にして貼り付けてください。"
      );
    }
    // private_key の改行（\\n → \n）復元
    if (parsed.private_key) {
      parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
    }
    initializeApp({
      credential: cert({
        projectId: parsed.project_id,
        clientEmail: parsed.client_email,
        privateKey: parsed.private_key,
      }),
      projectId: parsed.project_id,
    });
  }
  _db = getFirestore();
  return _db;
}

// gameState/current が存在しない場合は LOBBY で作成する
export async function ensureGameState() {
  const db = adminDb();
  const ref = db.collection("gameState").doc("current");
  const snap = await ref.get();
  if (!snap.exists) {
    await ref.set({
      phase: "LOBBY",
      current_question_id: null,
      revealed_correct_option: null,
      revealed_commentary: null,
      question_started_at: null,
      updated_at: new Date().toISOString(),
    });
  }
  return ref;
}

// ホットパス用：ref と直近スナップショットを1回の読み取りで返す。
// （ensureGameState + 別途 get() の2回読みを1回に削減）
export async function getGameState() {
  const db = adminDb();
  const ref = db.collection("gameState").doc("current");
  let snap = await ref.get();
  if (!snap.exists) {
    const init = {
      phase: "LOBBY" as const,
      current_question_id: null,
      revealed_correct_option: null,
      revealed_commentary: null,
      question_started_at: null,
      updated_at: new Date().toISOString(),
    };
    await ref.set(init);
    snap = await ref.get();
  }
  return { ref, snap, data: snap.data() as Record<string, unknown> };
}
