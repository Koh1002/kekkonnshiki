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
  // 第1問：チョコレート食べ比べ（ウォーミングアップ）
  {
    order_index: 1,
    is_active: true,
    title: "プロが作ったチョコレートはどちら？",
    description: "※比較対象は配布します。よく味わってお選びください。",
    option_a_label: "Ａ",
    option_b_label: "Ｂ",
    correct_option: "A",
    commentary:
      "正解は、自由が丘の割れチョコ専門店「チュベ・ド・ショコラ」のチョコ！ もう一方は、なんと新郎の手作りチョコでした。",
    timer_seconds: 30,
  },
  // 第2問：たまごっち vs そだてるっち
  {
    order_index: 2,
    is_active: true,
    title: "本物のたまごっちのキャラクターはどちら？",
    description:
      "片方は本物のたまごっち、もう片方は新郎オリジナルキャラ「そだてるっち」。見抜けますか？",
    option_a_label: "Ａ",
    option_b_label: "Ｂ",
    option_a_image: "/questions/q2_a.png",
    option_b_image: "/questions/q2_b.png",
    correct_option: "B",
    commentary:
      "正解は、世界のアイドル歌手を目指すたまごっちキャラ「きらりっち」！ もう一方は、新郎が新婦のために作ったパクリゲーム「そだてるっち」のキャラクターでした。",
    timer_seconds: 30,
  },
  // 第3問：絵画（ルノワール vs 新婦祖父）
  {
    order_index: 3,
    is_active: true,
    title: "本物の名画はどちら？",
    description:
      "片方は印象派の巨匠・ルノワールの作品（赤い花）。片方は新婦のお祖父さまが遺した一枚（緑の花）。芸術の目利き、その腕前を。",
    option_a_label: "Ａ",
    option_b_label: "Ｂ",
    option_a_image: "/questions/q3_a_renoir.jpeg",
    option_b_image: "/questions/q3_b_grandfather.jpeg",
    correct_option: "A",
    commentary:
      "正解は（赤い花）、ルノワールの名作「アネモネ」！ もう一方は、絵を趣味にされていた新婦のお祖父さまが描いたパンジーの絵。ご家族にとってかけがえのない宝物です。",
    timer_seconds: 45,
  },
  // 第4問：アクセサリー（ティファニー vs プチプラ）
  {
    order_index: 4,
    is_active: true,
    title: "新郎が誕生日にあげたネックレスはどちら？",
    description:
      "新郎から新婦への誕生日プレゼント。本物はどちら？もう片方はプチプラです。",
    option_a_label: "Ａ",
    option_b_label: "Ｂ",
    correct_option: "A",
    commentary:
      "正解は、新郎が新婦の誕生日にプレゼントしたティファニーのネックレス！ もう一方は、千円ほどのプチプラでした。新婦の宝物、輝きが違いますね。",
    timer_seconds: 30,
  },
  // 第5問：音楽聞き比べ（音源は会場で別機材から再生）
  {
    order_index: 5,
    is_active: true,
    title: "プロの演奏はどちら？",
    description:
      "※これから会場で Ａ → Ｂ の順に流します。耳を澄ましてよく聞いてください。",
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
