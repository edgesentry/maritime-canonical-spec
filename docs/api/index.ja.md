# API リファレンス

`@maritime-ai/canonical-spec`（EdgeSentry `maritime-canonical-spec`）の公開 API の TypeScript リファレンスです。

[`src/index.ts`](https://github.com/edgesentry/maritime-canonical-spec/blob/main/src/index.ts) から TypeDoc で生成しています。隔離ルールなどの叙述的なエンジン仕様は [エンジン](../engine/segregation.md) にあります。ここではエクスポートされたスキーマ・ヘルパー・型を扱います。

生成された API 詳細ページの本文は英語です（ナビとこの導入ページのみ日本語）。

## 生成ドキュメントを見る

- [公開 export 一覧](reference/index.md) — 型エイリアス・変数・関数の一覧

## 識別子

ISO 6346 コンテナ番号、UN/LOCODE、IMO 船舶番号:

- [`ContainerNumberSchema`](reference/variables/ContainerNumberSchema.md) / [`ContainerNumber`](reference/type-aliases/ContainerNumber.md)
- [`UnLocodeSchema`](reference/variables/UnLocodeSchema.md) / [`UnLocode`](reference/type-aliases/UnLocode.md)
- [`ImoNumberSchema`](reference/variables/ImoNumberSchema.md) / [`ImoNumber`](reference/type-aliases/ImoNumber.md)
- チェックデジット: [`computeIso6346CheckDigit`](reference/functions/computeIso6346CheckDigit.md), [`computeImoCheckDigit`](reference/functions/computeImoCheckDigit.md)

## 危険物申告

IMO IMDG / FAL Form 7 準拠の申告スキーマ:

- [`DGDeclarationSchema`](reference/variables/DGDeclarationSchema.md) / [`DGDeclaration`](reference/type-aliases/DGDeclaration.md)
- 品目 / 船舶 / 港: [`DgItemSchema`](reference/variables/DgItemSchema.md), [`VesselInfoSchema`](reference/variables/VesselInfoSchema.md), [`PortsSchema`](reference/variables/PortsSchema.md)

## 隔離検証エンジン

IMDG Code Table 7.2.4 に基づく決定論的な混載判定:

- [`validateSegregation`](reference/functions/validateSegregation.md)
- レポート / オプション: [`SegregationValidationReport`](reference/type-aliases/SegregationValidationReport.md), [`SegregationOptions`](reference/type-aliases/SegregationOptions.md)
- ルックアップ: [`lookupSegregation`](reference/functions/lookupSegregation.md), [`lookupSegregationByClass`](reference/functions/lookupSegregationByClass.md)

規範的な説明: [隔離検証エンジン](../engine/segregation.md)。
