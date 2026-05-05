import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { adminDb, ensureGameState } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 結婚式当日の本番5問。
// option_a_image / option_b_image は画像URLを後で管理画面から貼り付ける前提で null。
// correct_option は規約として「Ａ＝正解」で配置。当日までに画像を A/B に割り当てる際、
// 正解を Ａ 側に置けば編集不要、Ｂ 側に置きたい場合は管理画面で正解を Ｂ に切り替え可能。
const WEDDING_QUESTIONS = [
  // 第1問：飲食 食べ比べ（ウォーミングアップ）
  {
    order_index: 1,
    is_active: true,
    title: "第１問：本当に高級なのはどちら？",
    description: "ウォーミングアップ。お料理の目利き、見せてください。",
    option_a_label: "Ａ",
    option_b_label: "Ｂ",
    correct_option: "A",
    commentary:
      "正解は ＿＿。＊当日の飲食物に合わせて解説を更新してください＊",
    timer_seconds: 30,
  },
  // 第2問：たまごっち vs そだてるっち
  {
    order_index: 2,
    is_active: true,
    title: "第２問：たまごっちはどちら？",
    description:
      "片方はたまごっち、もう片方は新郎オリジナルキャラ「そだてるっち」。見抜けますか？",
    option_a_label: "Ａ",
    option_b_label: "Ｂ",
    option_a_image: "/questions/q2_a.png",
    option_b_image: "/questions/q2_b.png",
    correct_option: "A",
    commentary:
      "正解は Ａ。Ｂは新郎オリジナルの「そだてるっち」でした！",
    timer_seconds: 30,
  },
  // 第3問：絵画（ルノワール vs 新婦祖父）
  {
    order_index: 3,
    is_active: true,
    title: "第３問：本物の名画はどちら？",
    description:
      "片方は印象派の巨匠・ルノワールの作品（赤い花）。片方は新婦のお祖父さまが遺した一枚（緑の花）。芸術の目利き、その腕前を。",
    option_a_label: "Ａ",
    option_b_label: "Ｂ",
    option_a_image: "/questions/q3_a_renoir.jpg",
    option_b_image: "/questions/q3_b_grandfather.jpg",
    correct_option: "A",
    commentary:
      "正解は Ａ（赤い花）。ルノワールの花の絵。Ｂは新婦のお祖父さまの作品で、ご家族にとってかけがえのない宝物です。",
    timer_seconds: 45,
  },
  // 第4問：アクセサリー（ティファニー vs プチプラ）
  {
    order_index: 4,
    is_active: true,
    title: "第４問：本物のティファニーはどちら？",
    description:
      "新郎から新婦への誕生日プレゼント。本物のティファニーのネックレスはどちら？もう片方はプチプラです。",
    option_a_label: "Ａ",
    option_b_label: "Ｂ",
    correct_option: "A",
    commentary:
      "正解は ＿＿。新婦の宝物、輝きが違います。",
    timer_seconds: 30,
  },
  // 第5問：音楽聞き比べ（音源は会場で別機材から再生）
  {
    order_index: 5,
    is_active: true,
    title: "第５問：プロの演奏はどちら？",
    description:
      "司会の合図で Ａ → Ｂ の順に会場で音源を再生します。耳を澄まして聴き比べを。",
    option_a_label: "Ａ（先に再生）",
    option_b_label: "Ｂ（後に再生）",
    correct_option: "A",
    commentary: "正解は ＿＿。",
    timer_seconds: 60,
  },
];

// POST: 本番問題を投入。既存問題が無ければ追加、あって `replace: true` なら全削除→再投入。
export async function POST(req: Request) {
  if (!isAdmin()) {
    return NextResponse.json({ error: "認証必要" }, { status: 401 });
  }
  let replace = false;
  try {
    const body = await req.json();
    replace = body?.replace === true;
  } catch {
    // body 無し（旧UI互換）
  }

  const db = adminDb();
  await ensureGameState();
  const existing = await db.collection("questions").limit(1).get();

  if (!existing.empty) {
    if (!replace) {
      return NextResponse.json(
        { error: "既に問題が存在します。差し替える場合は replace: true を指定してください。" },
        { status: 409 }
      );
    }
    // 全削除
    const all = await db.collection("questions").get();
    let batch = db.batch();
    let count = 0;
    for (const doc of all.docs) {
      batch.delete(doc.ref);
      count++;
      if (count % 450 === 0) {
        await batch.commit();
        batch = db.batch();
      }
    }
    await batch.commit();
    // 出題中だった可能性があるため gameState の current_question_id を念のためクリア
    await db.collection("gameState").doc("current").update({
      current_question_id: null,
      revealed_correct_option: null,
      revealed_commentary: null,
      question_started_at: null,
      updated_at: new Date().toISOString(),
    });
  }

  // 投入
  const batch = db.batch();
  const now = new Date().toISOString();
  for (const q of WEDDING_QUESTIONS) {
    const ref = db.collection("questions").doc();
    batch.set(ref, {
      ...q,
      option_a_image: null,
      option_b_image: null,
      created_at: now,
    });
  }
  await batch.commit();
  return NextResponse.json({ ok: true, inserted: WEDDING_QUESTIONS.length });
}
