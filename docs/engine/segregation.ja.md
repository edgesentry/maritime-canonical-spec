# IMDG 危険品隔離検証エンジン（開発者ガイド）

本ドキュメントは、**港湾・海運・海事法令の前提知識がないソフトウェアエンジニア**が、本パッケージの隔離検証エンジン（`validateSegregation`）の役割・仕組み・使い方を理解し、システムに組み込むための実践的開発者ガイドです。

English: [`segregation.en.md`](./segregation.en.md)

---

## 1. 3分でわかる全体像：なぜこのエンジンが必要なのか？

### 背景と現実の課題
海上コンテナ輸送では、化学薬品、花火、バッテリー、高圧ガスなどの**危険物（Dangerous Goods: DG）**が日常的に運ばれています。

もし、**「火薬（爆発物）」と「酸化性物質（火を激しく燃え上がらせる薬品）」を同じコンテナに詰め込んで密閉**したらどうなるでしょうか？
航海中の熱や揺れ、容器のわずかな漏れで化学反応が起き、**数万本のコンテナを積んだ巨大コンテナ船が一瞬で大爆発・火災事故**になります（損害額は1隻で数百億円〜1,000億円超）。

### このエンジンが解決すること
世界中の船乗りや港湾作業員を守るため、国連の専門機関（IMO: 国際海事機関）は**「どの危険物とどの危険物を一緒のコンテナに入れてはいけないか」という厳格な混載禁止ルール（隔離規則）**を定めています。

本エンジンは、出荷伝票やコンテナ積載データを受け取り、**「このコンテナに詰めた危険品の組み合わせは法令上安全か？」を100%決定論的（数式のように白黒明確）にチェックするバリデーションライブラリ**です。

```text
 現場の入力データ（UN番号・等級・コンテナ番号）
                     │
                     ▼
 ┌───────────────────────────────────────────────┐
 │ validateSegregation()                         │
 │  ① 同一コンテナ内の危険品ペアを総当り        │
 │  ② 国際条約（IMDG 7.2表）＆ 日本法（危規則）照合│
 └───────────────────┬───────────────────────────┘
                     │
       ┌─────────────┴─────────────┐
       ▼                           ▼
 【PASS: 適合】              【CRITICAL_VIOLATION: 混載禁止】
 安全に出港・送信可能        即座に警告 ＆ 送信ロック（事故防止）
```

---

## 2. エンジニアのための海事用語ミニ辞典

コードを読む前に、以下の5つの専門用語だけ押さえておけば十分です。

| 用語 | 読み方・英語 | エンジニア向け平易な解説 |
| :--- | :--- | :--- |
| **CTU** | シー・ティー・ユー<br>(Cargo Transport Unit) | **「貨物運送ユニット」のこと。通常は「海上コンテナ 1本」**（またはトラック荷台）を指します。本エンジンでは `containerNumber` ごとに独立した隔離空間とみなします。 |
| **IMDG Code** | アイ・エム・ディー・ジー<br>(International Maritime Dangerous Goods Code) | **「国際海上危険物規程」**。世界中のすべての外航船が守らなければならない、危険品輸送の世界統一ルールブック（国際条約SOLASに基づく）。 |
| **UN番号** | ユー・エヌ 番号<br>(UN Number) | **国連が定めた危険物の「4桁ID」**。品名が英語や日本語で揺れていても、世界中で通用する識別子です。<br>（例: `UN1203`＝ガソリン、`UN1993`＝引火性液体、`UN0004`＝ピクリン酸アンモニウム/爆薬） |
| **Class / Division** | 等級・区分<br>(Hazard Class) | **危険の性質を表す分類コード**。<br>・Class `1.x`: 火薬・爆発物<br>・Class `2.x`: 高圧ガス<br>・Class `3`: ガソリンやアルコール等の引火性液体<br>・Class `5.1`: 酸素を出して火を激化させる酸化性物質<br>・Class `8`: 金属や皮膚を溶かす腐食性物質 |
| **隔離 (Segregation)** | かくり / セグリゲーション | **「特定の危険物同士を一定の距離以上離して積載すること」**。同一コンテナ内への混載禁止（Away from / Separated from）などがこれに該当します。 |
| **危規則** | ききそく | 日本の国内法令「**危険物船舶運送及び貯蔵規則**」の略称。日本の港から船積みする際は、IMDGに加えてこの法律の条文（第21条・第33条）に従う必要があります。 |
| **引火点 (Flash Point)** | いんかてん | 液体が気化して火がつく最低温度（摂氏 ℃）。特に**引火点が23℃未満**の液体は、真夏のコンテナ内で常温のまま揮発して充満するため、特別警戒（FP警告）が必要です。 |

---

## 3. クイックスタート（Quick Start）

### インストール
```bash
pnpm add @maritime-ai/canonical-spec
```

### 最小コード例（混載禁止違反の検知）

```typescript
import { validateSegregation, type DgItem } from "@maritime-ai/canonical-spec";

// 2つの危険品を同じコンテナ（MSKU1234565）に詰めたケース
const items: DgItem[] = [
  {
    unNumber: "0004",              // ピクリン酸アンモニウム
    properShippingName: "AMMONIUM PICRATE",
    classDivision: "1.1",          // ★ Class 1.1（火薬類：大量爆発危険）
    packingGroup: "II",
    marinePollutant: false,
    containerNumber: "MSKU1234565", // ★ コンテナA
    quantity: { grossMass: { value: 500, unit: "KGM" } },
    packageCount: { count: 10, packagingTypeCode: "4G" },
    emergencyContact: { name: "DG Desk", phone: "+81-3-0000-0000" },
  },
  {
    unNumber: "1479",              // 酸化性固体
    properShippingName: "OXIDIZING SOLID, N.O.S.",
    classDivision: "5.1",          // ★ Class 5.1（酸化性物質：火を加速）
    packingGroup: "II",
    marinePollutant: false,
    containerNumber: "MSKU1234565", // ★ コンテナA（同一コンテナ！）
    quantity: { grossMass: { value: 1200, unit: "KGM" } },
    packageCount: { count: 20, packagingTypeCode: "1A2" },
    emergencyContact: { name: "DG Desk", phone: "+81-3-0000-0000" },
  },
];

// バリデーション実行
const report = validateSegregation(items);

console.log(report.status);
// ➔ "CRITICAL_VIOLATION" （重大違反！同一コンテナ混載禁止）

console.log(report.conflicts[0]);
// ➔ {
//      unNumbers: ["0004", "1479"],
//      classes: ["1.1", "5.1"],
//      containerNumber: "MSKU1234565",
//      requiredSegregation: "4",
//      violated: true,
//      message: "IMDG Table 7.2.4 requires segregation level 4 between Class 1.1 and Class 5.1..."
//    }

console.log(report.citations);
// ➔ ["IMO IMDG Code Chapter 7.2 Table 7.2.4", "危険物船舶運送及び貯蔵規則第21条", "危険物船舶運送及び貯蔵規則第33条"]
```

---

## 4. 判定アルゴリズムの仕組み（内部ロジック）

エンジン内部では、以下の手順で決定論的に照合を行っています。

```text
[ステップ 1: グループ化]
  全アイテムを containerNumber（コンテナ番号）ごとにグループ化する。
  ※ 別々のコンテナに入っている危険品同士は、コンテナ間隔離が適用されるため「同一コンテナ内の混載禁止」違反にはならない。
       │
       ▼
[ステップ 2: ペアワイズ（総当り）照合]
  同一コンテナ内の危険品アイテムから、2個のペア（Item A, Item B）を全パターン抽出する。
       │
       ▼
[ステップ 3: 危険等級マトリクスの参照]
  各アイテムの「主危険（Primary Class）」および「副次危険（Subsidiary Risks）」のすべての組み合わせについて、
  IMDG Code Table 7.2.4（隔離テーブル）を照合する。
       │
       ▼
[ステップ 4: セル値の評価]
  ・セル値が「1, 2, 3, 4」の場合:
      ➔ 同一コンテナ混載禁止（violated: true / CRITICAL_VIOLATION）
  ・セル値が「X」または「*」の場合:
      ➔ 個別規定の目視確認が必要（violated: false / WARNING）
  ・Class 3 で引火点が 23℃ 未満の場合:
      ➔ 低引火点警告（requiredSegregation: "FP" / WARNING）
```

### Table 7.2.4 のセル値の意味

| セル値 | 条約上の名称 | 意味 | 本エンジンの判定 |
| :---: | :--- | :--- | :---: |
| **`1`** | **Away from**（離隔） | 最低3m以上離す。**同一コンテナへの混載は禁止**（IMDG 7.2.3.2） | ❌ **CRITICAL_VIOLATION** |
| **`2`** | **Separated from**（隔離） | 隔壁を挟んで離す。**同一コンテナへの混載は禁止** | ❌ **CRITICAL_VIOLATION** |
| **`3`** | **Separated by a complete compartment** | デッキや完全な防火区画を挟む。**同一コンテナへの混載は禁止** | ❌ **CRITICAL_VIOLATION** |
| **`4`** | **Separated longitudinally** | 船首・船尾方向で別区画にする。**最も厳しい隔離。同一コンテナ混載禁止** | ❌ **CRITICAL_VIOLATION** |
| **`X`** | **DGL Specific** | 原則として混載可能だが、個別の危険物リスト（DGL）に特別規定がある場合がある | ⚠️ **WARNING**（人間確認推奨） |
| **`*`** | **Class 1 Specific** | 火薬類同士の互換性グループ表（7.2.7）を確認する必要がある | ⚠️ **WARNING**（人間確認推奨） |
| **`FP`** | **Low Flash Point** | Class 3（引火性液体）で引火点 &lt; 23℃ のため、密閉空間での揮発リスクが高い | ⚠️ **WARNING**（引火注意） |

---

## 5. 出力仕様とフロントエンド／バックエンドでのハンドリング

```typescript
type SegregationStatus = "PASS" | "WARNING" | "CRITICAL_VIOLATION";

type SegregationConflict = {
  unNumbers: [string, string];          // 衝突した2つのUN番号（例: ["0004", "1479"]）
  properShippingNames: [string, string];// 衝突した品名
  classes: [string, string];            // 衝突した等級（例: ["1.1", "5.1"]）
  containerNumber: string;              // 発生箇所のコンテナ番号
  requiredSegregation: "1" | "2" | "3" | "4" | "X" | "*" | "FP";
  violated: boolean;                    // true の場合は法令違反（混載不可）
  message: string;                      // 開発者・オペレーター向けエラー説明文
};

type SegregationValidationReport = {
  status: SegregationStatus;            // 全体ステータス
  conflicts: SegregationConflict[];     // 検出された衝突一覧（0件なら空配列）
  citations: string[];                  // 根拠条文（監査ログ・法廷証拠用）
};
```

### アプリケーション実装での推奨ハンドリング

| `report.status` | 意味 | バックエンドの挙動 | UI（Chatwork/Web画面）の表示 |
| :--- | :--- | :--- | :--- |
| **`PASS`** | 完全適合 | そのまま港湾EDI（Cyber Port等）へ送信許可 | 「✅ 隔離規則クリア（安全）」と緑色表示し、ワンタップ承認を有効化 |
| **`WARNING`** | 要目視確認 | 送信はブロックしないが、警告を表示 | 「⚠️ 【注意】引火点23℃未満または個別規定あり」と黄色で注意喚起 |
| **`CRITICAL_VIOLATION`** | **法令違反**<br>（混載禁止） | **送信パイプラインを物理的に停止（ブロック）** | **「❌【混載禁止エラー】コンテナを別々に分けてください」**と赤色アラート。ワンタップ承認ボタンをロック（Active Friction） |

---

## 6. 法的根拠と条文番号（監査対応）

本エンジンは、海難事故発生時の保険金請求・免責立証・海事仲裁（ロンドンLMAA等）にそのまま提出できる監査証跡として、以下の公的法令を `citations` 配列に出力します。

1. **国際法**: IMO IMDG Code Chapter 7.2（Table 7.2.4、Section 7.2.3.2、Section 7.2.3.3）
2. **日本国内法**: 船舶安全法に基づく「危険物船舶運送及び貯蔵規則（危規則）」
   * **第21条（危険物等の隔離）**: 危険物相互の隔離義務
   * **第33条（コンテナ相互の隔離）**: 運送用具（コンテナ）における隔離義務

> **エンジニア向け注記（条文番号の誤解に注意）**:  
> Web上の古い解説記事等で「危規則第14条・15条が隔離」と書かれている場合がありますが、実際の条文本文では第14条は「ばら積みコンテナの例外」、第15条は「オーバーパック」です。**混載隔離の法令本体は第21条および第33条**であり、本エンジンは厳密に公的条文番号（第21条・第33条）を引用しています。

---

## 7. オプション設定

```typescript
// 日本の危規則の引用を外して国際条約（IMDG）のみにする場合（海外港湾向け）
const report = validateSegregation(items, {
  japanKikisonOverlay: false, // 既定値は true
});
```

---

## 8. FAQ（よくある質問）

**Q. 危険な組み合わせでも、別のコンテナ番号ならエラーになりませんか？**  
**A. はい、エラーになりません。** 本エンジンのスコープは「同一コンテナ（同一CTU）内での混載可否」です。`containerNumber` が異なっていれば、コンテナ同士が別個に密閉されるため、本エンジンは `PASS` を返します（船上のコンテナ配置場所の隔離は船社の本船積付計算システム（Stowage Plan）の管轄となります）。

**Q. 外部ネットワークやデータベースへの接続は必要ですか？**  
**A. 一切不要です。** 本パッケージは純粋なTypeScript/JavaScriptのみで書かれており、内部にTable 7.2.4の完全なマトリクスを静的データとして保持しています。Cloudflare Workers、Node.js、ブラウザ環境のどこでも、マイクロ秒単位でオフライン高速動作します。

