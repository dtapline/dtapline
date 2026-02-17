import { describe, expect, it } from "vitest"
import { generateDiffUrl } from "../../src/Utils/DiffUrlGenerator.js"

describe("DiffUrlGenerator", () => {
  const fromCommit = "abc123def456"
  const toCommit = "xyz789abc012"

  describe("GitHub", () => {
    it("generates diff URL for basic GitHub repo", () => {
      const url = generateDiffUrl("https://github.com/owner/repo", fromCommit, toCommit)
      expect(url).toBe(`https://github.com/owner/repo/compare/${fromCommit}...${toCommit}`)
    })

    it("normalizes GitHub repo with .git suffix", () => {
      const url = generateDiffUrl("https://github.com/owner/repo.git", fromCommit, toCommit)
      expect(url).toBe(`https://github.com/owner/repo/compare/${fromCommit}...${toCommit}`)
    })

    it("normalizes GitHub repo with tree path", () => {
      const url = generateDiffUrl(
        "https://github.com/dtapline/dtapline/tree/main/packages/api",
        fromCommit,
        toCommit
      )
      expect(url).toBe(`https://github.com/dtapline/dtapline/compare/${fromCommit}...${toCommit}`)
    })

    it("normalizes GitHub repo with blob path", () => {
      const url = generateDiffUrl(
        "https://github.com/owner/repo/blob/main/src/index.ts",
        fromCommit,
        toCommit
      )
      expect(url).toBe(`https://github.com/owner/repo/compare/${fromCommit}...${toCommit}`)
    })

    it("normalizes GitHub repo with issues path", () => {
      const url = generateDiffUrl("https://github.com/owner/repo/issues/123", fromCommit, toCommit)
      expect(url).toBe(`https://github.com/owner/repo/compare/${fromCommit}...${toCommit}`)
    })

    it("normalizes GitHub repo with trailing slash", () => {
      const url = generateDiffUrl("https://github.com/owner/repo/", fromCommit, toCommit)
      expect(url).toBe(`https://github.com/owner/repo/compare/${fromCommit}...${toCommit}`)
    })
  })

  describe("GitLab", () => {
    it("generates diff URL for basic GitLab repo", () => {
      const url = generateDiffUrl("https://gitlab.com/owner/repo", fromCommit, toCommit)
      expect(url).toBe(`https://gitlab.com/owner/repo/-/compare/${fromCommit}...${toCommit}`)
    })

    it("normalizes GitLab repo with tree path", () => {
      const url = generateDiffUrl(
        "https://gitlab.com/owner/repo/-/tree/main/packages/api",
        fromCommit,
        toCommit
      )
      expect(url).toBe(`https://gitlab.com/owner/repo/-/compare/${fromCommit}...${toCommit}`)
    })

    it("normalizes GitLab repo with blob path", () => {
      const url = generateDiffUrl(
        "https://gitlab.com/owner/repo/-/blob/main/src/index.ts",
        fromCommit,
        toCommit
      )
      expect(url).toBe(`https://gitlab.com/owner/repo/-/compare/${fromCommit}...${toCommit}`)
    })
  })

  describe("Bitbucket", () => {
    it("generates diff URL for basic Bitbucket repo", () => {
      const url = generateDiffUrl("https://bitbucket.org/owner/repo", fromCommit, toCommit)
      expect(url).toBe(`https://bitbucket.org/owner/repo/branches/compare/${toCommit}..${fromCommit}`)
    })

    it("normalizes Bitbucket repo with src path", () => {
      const url = generateDiffUrl(
        "https://bitbucket.org/owner/repo/src/main/packages/api",
        fromCommit,
        toCommit
      )
      expect(url).toBe(`https://bitbucket.org/owner/repo/branches/compare/${toCommit}..${fromCommit}`)
    })
  })

  describe("Azure DevOps", () => {
    it("generates diff URL for basic Azure DevOps repo", () => {
      const url = generateDiffUrl(
        "https://dev.azure.com/org/project/_git/repo",
        fromCommit,
        toCommit
      )
      expect(url).toBe(
        `https://dev.azure.com/org/project/_git/repo/branchCompare?baseVersion=GC${fromCommit}&targetVersion=GC${toCommit}`
      )
    })

    it("normalizes Azure DevOps repo with query parameters", () => {
      const url = generateDiffUrl(
        "https://dev.azure.com/nn-bank/payments-apollo/_git/apollo-backend?path=/packages/utils",
        fromCommit,
        toCommit
      )
      expect(url).toBe(
        `https://dev.azure.com/nn-bank/payments-apollo/_git/apollo-backend/branchCompare?baseVersion=GC${fromCommit}&targetVersion=GC${toCommit}`
      )
    })

    it("normalizes Azure DevOps repo with path and version query params", () => {
      const url = generateDiffUrl(
        "https://dev.azure.com/org/project/_git/repo?path=/src&version=GBmain",
        fromCommit,
        toCommit
      )
      expect(url).toBe(
        `https://dev.azure.com/org/project/_git/repo/branchCompare?baseVersion=GC${fromCommit}&targetVersion=GC${toCommit}`
      )
    })
  })

  describe("Unknown platforms", () => {
    it("returns null for unknown Git platforms", () => {
      const url = generateDiffUrl("https://example.com/owner/repo", fromCommit, toCommit)
      expect(url).toBe(null)
    })
  })
})
