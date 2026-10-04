# IMDG 隔離検証エンジン

`@maritime-ai/canonical-spec` の `validateSegregation` に対する規範仕様
（[GitHub issue #23](https://github.com/edgesentry/maritime-canonical-spec/issues/23)）。
単体テストはこの受け入れ用例と対応する。

公的な国際規則・国内法令の条文から起こした工学契約であり、法的助言ではない。

English: [`segregation.en.md`](./segregation.en.md)

## 1. 目的

混載される危険物アイテムを、次の規則に対して決定論的に検証する。

1. IMO IMDG Code 第 7.2 章の一般隔離規定（Table 7.2.4 および関連条項）
2. 日本の危険物船舶運送及び貯蔵規則（危規則）に基づく隔離——引用オーバーレイとして設定可能

Apache-2.0 で公開することで、損保・仲裁・デジタル基盤が検査・再現できる安全基準の参照実装を提供する。

## 2. 根拠

| 役割 | 出典 | 取り込む内容 |
| --- | --- | --- |
| 隔離マトリクス・同一 CTU 禁止 | IMO IMDG Code 第 7.2 章 | Table 7.2.4（`1`/`2`/`3`/`4`/`X`/`*`）、7.2.3.2、7.2.3.3 |
| 国内引用オーバーレイ | 危険物船舶運送及び貯蔵規則 | **第21条**（危険物等の隔離）、**第33条**（コンテナ相互の隔離） |
| 入力型 | 本パッケージの `DgItem` | `unNumber`、`properShippingName`、`classDivision`、`subsidiaryRisks`、`flashPoint`、`containerNumber` |

### 条文番号について

二次資料に「第14条・第15条＝隔離」とある場合があるが、条文本文では第14条はばら積みコンテナの例外、第15条はオーバーパックである。隔離の本体は **第21条・第33条** であり、`citations` はこちらを用いる。

## 3. 入力契約

- 入口: `validateSegregation(items: readonly DgItem[], options?)`
- 検証範囲は **同一 `containerNumber`（同一 CTU）内のペアワイズ**
- 等級は Table 7.2.4 のキーへ正規化する:

| `classDivision` | テーブルキー |
| --- | --- |
| `1.1`, `1.2`, `1.5` | `1.1` |
| `1.3`, `1.6` | `1.3` |
| `1.4` | `1.4` |
| 裸の `1` | `1.1`（最も厳しい Class 1 グループへの防御的既定） |
| `2.1`–`2.3`, `3`, `4.1`–`4.3`, `5.1`, `5.2`, `6.1`, `6.2`, `7`, `8`, `9` | 同一文字列 |

## 4. 隔離判定アルゴリズム

同一 `containerNumber` の各非順序ペアについて:

1. 主危険 `classDivision` と各 `subsidiaryRisks` から危険集合を作る。
2. 副次が Class 1（`1` または `1.x`）のときはテーブル照合上 **`1.3`** とみなす（IMDG 7.2.3.3）。
3. すべての危険ペアで Table 7.2.4 を引き、数値は最厳（`4` > `3` > `2` > `1`）を採用。数値があれば `X` / `*` より優先する。
4. セル値を衝突（次節）へ写す。

Class 1 同士（`*`）は「7.2.7 を見よ」を意味する。互換性グループは v1 では対象外。

## 5. ステータス対応

| テーブルセル / 規則 | 衝突 | `violated` | レポートへの寄与 |
| --- | --- | --- | --- |
| `1`, `2`, `3`, `4` | あり | `true` | `CRITICAL_VIOLATION` |
| `X` | あり | `false` | `WARNING` |
| `*` | あり | `false` | `WARNING` |
| Class 3 かつ引火点 &lt; 23 °C | あり（`requiredSegregation: "FP"`） | `false` | `WARNING` |

集約: `violated` が一つでもあれば `CRITICAL_VIOLATION`。なければ衝突ありで `WARNING`。なければ `PASS`。

## 6. 出力契約

```ts
type SegregationStatus = "PASS" | "WARNING" | "CRITICAL_VIOLATION";

type SegregationConflict = {
  unNumbers: [string, string];
  properShippingNames: [string, string];
  classes: [string, string];
  containerNumber: string;
  requiredSegregation: "1" | "2" | "3" | "4" | "X" | "*" | "FP";
  violated: boolean;
  message: string;
};

type SegregationValidationReport = {
  status: SegregationStatus;
  conflicts: SegregationConflict[];
  citations: string[];
};

type SegregationOptions = {
  /** 既定 true — citations に危規則第21条・第33条を含める */
  japanKikisonOverlay?: boolean;
};
```

## 7. 公開 API

```ts
import { validateSegregation } from "@maritime-ai/canonical-spec";

const report = validateSegregation(items, { japanKikisonOverlay: true });
```

実装: `src/engine/segregation/`。

## 8. v1 の対象外

- Dangerous Goods List 全体 / UN マスター（column 16b の SG コード）
- Class 1 互換性グループ表（7.2.7）
- 入力フィールド `segregationGroups` を超える化学的隔離グループ規則

## 9. 受け入れ用例

| # | シナリオ | 期待 |
| --- | --- | --- |
| A | Class `1.1` + Class `5.1` 同一 CTU | `CRITICAL_VIOLATION`（表値 `4`） |
| B | Class `2.1` + Class `3` 同一 CTU | `CRITICAL_VIOLATION`（表値 `2`） |
| C | Class `1.1` + Class `5.1` 別 CTU | `PASS` |
| D | Class `3` + Class `8` 同一 CTU | `WARNING`（表値 `X`） |
| E | Class `3`、引火点 `12` CEL | `WARNING`（`FP`） |
| F | 主危険 `8` + 副次 `5.1` vs Class `3` | `CRITICAL_VIOLATION`（`5.1`×`3` = `2`） |
| G | Class `3` 単独、引火点 `23` CEL | `PASS` |
| H | 重大ペアで `japanKikisonOverlay: false` | IMDG 引用のみ（危規則なし） |
