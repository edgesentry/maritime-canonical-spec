# IMDG 危険品隔離検証エンジン（開発者向け工学仕様・実装ガイド）

本ドキュメントは、**港湾・海運・海事法令の前提知識を持たないソフトウェアエンジニア**が、本パッケージの隔離検証エンジン（`validateSegregation`）の設計思想・ドメインロジック・API仕様を正確に理解し、基幹業務システムやゲートウェイに組み込むための技術仕様書です。

English: [`segregation.en.md`](./segregation.en.md)

---

## 1. 概要と工学的背景：決定論的危険品隔離検証の必要性

### 海上コンテナ輸送における物理的リスクとドメイン特性
海上コンテナ輸送では、化学工業品、半導体材料、バッテリー、高圧ガス、医薬品などの**危険物（Dangerous Goods: DG）**が大量に流通しています。

密閉された単一の海上コンテナ（Cargo Transport Unit: CTU）内において、**爆発物（Class 1）と酸化性物質（Class 5.1）が同一空間に混載**された場合、航海中の温度変化・船体動揺・微小漏洩による接触が劇烈な自己加速的酸化還元反応を誘発し、洋上での壊滅的コンテナ爆発・火災を引き起こします。近代の大型コンテナ船火災は、1インシデントあたり数百億円から1,000億円を超えるシステミックな損害に直結します。

### 本バリデーションエンジンの責務
国際海事機関（IMO）は、海上人命安全条約（SOLAS条約）に基づき、**「どの危険物同士を同一コンテナ内に混載してはならないか」を厳格に定めた国際海上危険物規程（IMDG Code 第7.2章 隔離規定）**を制定しています。

本エンジンは、出荷伝票やブッキングデータから抽出された危険品アイテム群を受け取り、**「同一コンテナ内に割り当てられた危険物の組み合わせが国際条約および国内法規に照らして適法かつ安全か」を100%決定論的（外生確率や曖昧性を排した静的検証）に判定する検証エンジン**です。

```text
 危険品申告データ（UN番号・危険物等級・コンテナ識別番号）
                           │
                           ▼
 ┌────────────────────────────────────────────────────────┐
 │ validateSegregation()                                  │
 │  ① containerNumber 単位での物理境界グルーピング      │
 │  ② 国際条約（IMO IMDG Code Table 7.2.4）マトリクス照合 │
 │  ③ 日本国内法規（危規則第21条・第33条）オーバーレイ   │
 └─────────────────────────┬──────────────────────────────┘
                           │
         ┌─────────────────┴─────────────────┐
         ▼                                   ▼
   【PASS: 適合】               【CRITICAL_VIOLATION: 混載禁止】
 隔離基準を完全クリア         同一CTU内混載不可（即座にブロック）
 法定EDI送信・船積み承認可     Active Frictionによる承認ロック
```

---

## 2. 開発者が把握すべき海事物流用語集

コードリーディングおよびデータマッピングに必要なコア用語の定義です。

| 用語 | 原語・正式呼称 | ソフトウェア開発における解釈と定義 |
| :--- | :--- | :--- |
| **CTU** | Cargo Transport Unit<br>（貨物運送ユニット） | **「海上コンテナ 1本」**（または貨物車輛）。本エンジンにおける最小の閉鎖物理境界であり、`containerNumber` 属性によって識別されます。 |
| **IMDG Code** | International Maritime Dangerous Goods Code<br>（国際海上危険物規程） | **海上危険物運送の世界共通規則**。国際海事機関（IMO）がSOLAS条約第VII章に基づき採択した国際強制力を持つ基準体系。 |
| **UN番号** | United Nations Number<br>（国連番号） | **国連が危険物に付与した4桁の数字コード**。品名表記の言語差（日・英・中等）に依存しない世界共通の物質識別子。<br>（例: `UN1203`＝ガソリン、`UN1993`＝引火性液体（他類別無）、`UN0004`＝ピクリン酸アンモニウム） |
| **Class / Division** | Hazard Class / Division<br>（危険物等級・区分） | **危険性の主分類**。<br>・Class `1.1`〜`1.6`: 火薬類（爆発性）<br>・Class `2.1`〜`2.3`: 高圧ガス<br>・Class `3`: 引火性液体<br>・Class `5.1`: 酸化性物質<br>・Class `8`: 腐食性物質 |
| **隔離 (Segregation)** | Segregation<br>（離隔・隔離） | **「特定の危険物同士を定められた距離や隔壁で遮断して運送すること」**。同一コンテナ内への混載禁止（離隔・隔離等級1〜4）を含みます。 |
| **危規則** | 危険物船舶運送及び貯蔵規則<br>（昭和32年運輸省令第30号） | 日本の港湾から危険物を船積みする際に適用される**船舶安全法体系の国内省令**。IMDG Codeと同期しつつ、第21条および第33条で運送用具内の隔離を義務付け。 |
| **引火点 (Flash Point)** | Flash Point (Closed Cup) | 液体が引火性蒸気を発生する最低温度（℃）。IMDGコード上、**引火点が23℃未満**の物質は密閉空間での揮発爆発リスクが高く、特別な安全措置（FP警告）の対象となります。 |

---

## 3. クイックスタート（Quick Start）

### インストール
```bash
pnpm add @maritime-ai/canonical-spec
```

### 最小実装例：同一コンテナ内の混載禁止違反の検知

```typescript
import { validateSegregation, type DgItem } from "@maritime-ai/canonical-spec";

// 同一コンテナ（MSKU1234565）に割り当てられた2つの危険品アイテム
const manifestItems: DgItem[] = [
  {
    unNumber: "0004",
    properShippingName: "AMMONIUM PICRATE",
    classDivision: "1.1",          // Class 1.1: 火薬類（大量爆発危険）
    packingGroup: "II",
    marinePollutant: false,
    containerNumber: "MSKU1234565", // コンテナ A
    quantity: { grossMass: { value: 500, unit: "KGM" } },
    packageCount: { count: 10, packagingTypeCode: "4G" },
    emergencyContact: { name: "DG Desk", phone: "+81-3-0000-0000" },
  },
  {
    unNumber: "1479",
    properShippingName: "OXIDIZING SOLID, N.O.S.",
    classDivision: "5.1",          // Class 5.1: 酸化性物質（激しい支燃性）
    packingGroup: "II",
    marinePollutant: false,
    containerNumber: "MSKU1234565", // コンテナ A（同一CTU！）
    quantity: { grossMass: { value: 1200, unit: "KGM" } },
    packageCount: { count: 20, packagingTypeCode: "1A2" },
    emergencyContact: { name: "DG Desk", phone: "+81-3-0000-0000" },
  },
];

// 決定論的バリデーションの実行
const report = validateSegregation(manifestItems);

console.log(report.status);
// => "CRITICAL_VIOLATION" （同一コンテナ混載禁止の重大違反）

console.log(report.conflicts[0]);
// => {
//      unNumbers: ["0004", "1479"],
//      classes: ["1.1", "5.1"],
//      containerNumber: "MSKU1234565",
//      requiredSegregation: "4",
//      violated: true,
//      message: "IMDG Table 7.2.4 requires segregation level 4 between Class 1.1 and Class 5.1..."
//    }

console.log(report.citations);
// => [
//      "IMO IMDG Code Chapter 7.2 Table 7.2.4",
//      "危険物船舶運送及び貯蔵規則第21条",
//      "危険物船舶運送及び貯蔵規則第33条"
//    ]
```

---

## 4. 判定アルゴリズムの仕様と内部構造

エンジン内部のパイプラインは、以下のステップで純粋関数として決定論的に実行されます。

```text
[Step 1: 物理境界分割]
  全アイテムを containerNumber（コンテナ識別番号）単位でパーティショニング。
  ※ 異なる containerNumber のアイテム同士は別個に密閉されるため、同一CTU混載チェックの対象外。
       │
       ▼
[Step 2: コンテナ内ペアワイズ総当り]
  同一コンテナ内のアイテム群から、順序を考慮しないすべての組み合わせ（Item A, Item B）を生成。
       │
       ▼
[Step 3: 危険属性セットの展開]
  各アイテムの主危険性（classDivision）および副次危険性（subsidiaryRisks）を展開。
  ※ 副次危険がClass 1（火薬類）の場合は、IMDG 7.2.3.3の規定に基づきテーブル上「1.3」として評価。
       │
       ▼
[Step 4: Table 7.2.4 マトリクス照合]
  危険等級ペアに対応するセル値を Table 7.2.4 から検索。
  複数セルが該当する場合は最も厳しい数値（4 > 3 > 2 > 1 > X / *）を採用。
       │
       ▼
[Step 5: 適合性評価とレポート生成]
  ・セル値「1, 2, 3, 4」: violated: true ➔ CRITICAL_VIOLATION（同一コンテナ混載禁止）
  ・セル値「X」または「*」: violated: false ➔ WARNING（個別規定参照要）
  ・Class 3 かつ引火点 < 23℃: violated: false ➔ WARNING（requiredSegregation: "FP"）
```

### IMDG Table 7.2.4 隔離等級の工学的意味

| セル値 | 条約上の呼称 | 船舶工学的要件 | コンテナ内混載の判定 |
| :---: | :--- | :--- | :---: |
| **`1`** | **Away from**（離隔） | 水平方向に最低3m以上離隔 | ❌ **CRITICAL_VIOLATION**（混載禁止） |
| **`2`** | **Separated from**（隔離） | 完全な隔壁・甲板を挟んで離隔 | ❌ **CRITICAL_VIOLATION**（混載禁止） |
| **`3`** | **Separated by complete compartment** | 完全な防火区画・船倉を挟んで離隔 | ❌ **CRITICAL_VIOLATION**（混載禁止） |
| **`4`** | **Separated longitudinally** | 縦方向に介在区画を挟んで離隔（最厳格） | ❌ **CRITICAL_VIOLATION**（混載禁止） |
| **`X`** | **DGL Specific** | 原則混載可能だが個別のDGL（危険物リスト）確認を要する | ⚠️ **WARNING**（目視確認勧告） |
| **`*`** | **Class 1 Specific** | 火薬類相互の互換性グループ規定（7.2.7）に基づく | ⚠️ **WARNING**（互換性確認勧告） |
| **`FP`** | **Low Flash Point** | 引火性液体で引火点 &lt; 23℃（高揮発性密閉リスク） | ⚠️ **WARNING**（低引火点警戒） |

---

## 5. 出力スキーマとアプリケーション統合指針

### 型定義
```typescript
type SegregationStatus = "PASS" | "WARNING" | "CRITICAL_VIOLATION";

type SegregationConflict = {
  unNumbers: [string, string];          // 衝突したUN番号のペア
  properShippingNames: [string, string];// 衝突した品名のペア
  classes: [string, string];            // 衝突した危険等級のペア
  containerNumber: string;              // 該当コンテナ番号
  requiredSegregation: "1" | "2" | "3" | "4" | "X" | "*" | "FP";
  violated: boolean;                    // 法令違反（混載禁止）フラグ
  message: string;                      // 監査・表示用メッセージ
};

type SegregationValidationReport = {
  status: SegregationStatus;            // 総合判定ステータス
  conflicts: SegregationConflict[];     // 衝突・警告リスト
  citations: string[];                  // 適用法令・条約の条文根拠配列
};
```

### システムアーキテクチャ上の推奨ハンドリング

| `report.status` | システム状態 | バックエンド（パイプライン）制御 | フロントエンド / ユーザー通知 |
| :--- | :--- | :--- | :--- |
| **`PASS`** | 完全適合 | 港湾EDI（Cyber Port一括取込等）へのファイル出力・送信を許可 | 緑色バッジ表示（「安全確認済」）。ワンタップ承認を活性化 |
| **`WARNING`** | 条件付き適合<br>（注意喚起） | 処理は中断せず、監査ログに警告フラグを記録して進行 | 黄色バッジ表示（「要確認: 低引火点・個別規定あり」）。注意事項をトースト表示 |
| **`CRITICAL_VIOLATION`** | **重大な法令違反**<br>（混載不可） | **外部送信・EDIパイプラインを物理的に遮断（Fail-Closed）** | **赤色アラート表示。ワンタップ承認ボタンをロック**し、コンテナ分割または品目是正の明示的入力を強制（Active Friction） |

---

## 6. 法的根拠と公的外部リファレンス（規範的資料）

本エンジンが出力する `citations` 配列および判定アルゴリズムは、以下の公的規格・条約・法令に直接準拠しています。海事鑑定・保険査定・裁判証拠としても完全なトレーサビリティを持ちます。

### 国際機関・国際条約（International Treaties & Standards）
* **IMO (国際海事機関) - IMDG Code**:  
  [International Maritime Dangerous Goods (IMDG) Code](https://www.imo.org/en/OurWork/Safety/Pages/DangerousGoods-default.aspx)  
  *適用条項*: Chapter 7.2 (Segregation), Table 7.2.4 (Segregation Table on board container ships), Sections 7.2.3.2 & 7.2.3.3.
* **IMO - SOLAS 条約**:  
  [International Convention for the Safety of Life at Sea (SOLAS), 1974](https://www.imo.org/en/About/Conventions/Pages/International-Convention-for-the-Safety-of-Life-at-Sea-(SOLAS),-1974.aspx)  
  *適用条項*: Chapter VII (Carriage of dangerous goods).
* **DCSA (デジタルコンテナ船協会) - 危険品インターフェース規格**:  
  [DCSA Standard for Dangerous Goods Data Interface 1.0](https://dcsa.org/standards/dangerous-goods/)  
  *適用条項*: 船社・港湾間の危険品自動照合・データ交換仕様。
* **TT Club & CINS - コンテナ安全白書**:  
  [TT Club & CINS Cargo Integrity White Paper](https://www.ttclub.com/news-and-resources/publications/cargo-integrity-white-paper/)  
  *工学的根拠*: 海上コンテナ火災事故の66%は不適正申告および隔離不備に起因し、アルゴリズムによる全数機械検証が人的過失防止に不可欠であるとする勧告。

### 日本国内法令（Japanese Statutory Acts & Ordinances）
* **e-Gov 法令検索 - 船舶安全法**:  
  [船舶安全法（昭和8年法律第11号）](https://laws.e-gov.go.jp/law/308AC0000000011)  
  *適用条項*: 第2条（堪航性及び人命安全保持義務）、第28条（危険物運送規則委任規定）。
* **e-Gov 法令検索 - 危険物船舶運送及び貯蔵規則（危規則）**:  
  [危険物船舶運送及び貯蔵規則（昭和32年運輸省令第30号）](https://laws.e-gov.go.jp/law/332M50000800030)  
  *適用条項*:  
  * **第21条（危険物等の隔離）**: 危険物相互の隔離義務に関する基本規定。  
  * **第33条（コンテナ相互の隔離）**: 運送用具（コンテナ等のCTU）内における隔離および混載制限規定。  
  *(注: 古い非公式解説等で第14条・15条が隔離と誤認される例がありますが、条文上の隔離実体規定は第21条および第33条です)*
* **一般社団法人 日本海事検定協会 (NKKK)**:  
  [日本海事検定協会 危険物関連業務及び運送手引](https://www.nkkk.or.jp/business/kikensya/)  
  *適用基準*: 日本国内港湾における危険品積載・コンテナ収納検査の実務手引。

---

## 7. ランタイム特性と構成オプション

```typescript
// 日本国外の航路等で日本の危規則条文の引用を除外し、国際条約（IMDG）のみ引用する場合
const report = validateSegregation(items, {
  japanKikisonOverlay: false, // 既定値は true
});
```

### システムリソースと実行保証
* **依存関係ゼロ**: 外部データベース接続、ネットワークI/O、ファイルシステムアクセスを一切行いません。
* **高ポータビリティ**: 純粋なTypeScript/ESMとしてコンパイルされ、Cloudflare Workers (V8 Isolate)、Node.js (18/20/22+)、Deno、各種ブラウザ環境で1ミリ秒未満で静的実行されます。
* **メモリ安全性**: イミュータブルな入力受付と厳格な配列走査により、入力オブジェクトへの破壊的変更やメモリリークは発生しません。


