# Git運用

## ブランチ構成

本プロジェクトでは、以下のブランチを使用する。

- **main**
  - 本番環境
  - Vercel Productionと連携するブランチ
- **develop**
  - 次回リリース候補
  - 機能統合・結合確認を行うブランチ
- **feature/issue-XXX-xxxx**
  - Issue単位で作業する開発ブランチ

---

## 標準フロー

通常の開発では、以下の流れを標準とする。

```text
Issue作成
    ↓
featureブランチ作成
    ↓
実装
    ↓
build・lint
    ↓
ローカル確認
    ↓
コミット
    ↓
featureへPush
    ↓
developへマージ
    ↓
結合確認
    ↓
mainへマージ
    ↓
GitHub Push
    ↓
Vercel Production
```

---

## 例外フロー

以下の条件を満たす場合は、`develop`を経由せず **feature → main** とすることを認める。

- 個人開発である
- 変更範囲が限定的である
- ローカル動作確認が完了している
- build・lintが成功している
- 実API確認が完了している
- 本番影響を十分把握している

フローは次のとおり。

```text
Issue作成
    ↓
featureブランチ作成
    ↓
実装
    ↓
build・lint
    ↓
ローカル確認
    ↓
コミット
    ↓
featureへPush
    ↓
mainへマージ
    ↓
GitHub Push
    ↓
Vercel Production
```

---

## マージ前チェック

`main`または`develop`へマージする前に、以下を必ず確認する。

- [ ] build成功
- [ ] lint成功
- [ ] ローカル動作確認
- [ ] 実API確認（可能な範囲）
- [ ] 変更内容がIssueと一致している
- [ ] `git status`が`working tree clean`である
- [ ] コミットメッセージが適切である

---

## Issue完了条件

Issueを完了する際は、変更範囲に応じて以下を確認し、実施できなかった項目は未確認として記録する。

- [ ] build成功
- [ ] lint確認（既存エラーと今回追加分を区別）
- [ ] ローカル確認
- [ ] API確認
- [ ] commit
- [ ] push
- [ ] mainマージ
- [ ] GAS／Vercelデプロイ確認
- [ ] 本番確認
- [ ] `CHANGELOG.md`更新

`CHANGELOG.md`は利用者から個別の指示がなくてもIssue完了作業の一部として必ず更新する。同じIssueの記録がすでにある場合は重複追加せず、既存項目の確認結果・Commit・マージ・デプロイ・本番確認を更新する。

---

## ブランチ削除

Issue完了後は、不要になったfeatureブランチを削除する。

### ローカル

```bash
git branch -d feature/issue-XXX-xxxx
```

### GitHub

```bash
git push origin --delete feature/issue-XXX-xxxx
```

---

## 運用方針

- **標準運用は `feature → develop → main` とする。**
- **個人開発・小規模修正・緊急対応では `feature → main` を許可する。**
- 運用方法は、開発規模・リスク・影響範囲を考慮して選択する。
