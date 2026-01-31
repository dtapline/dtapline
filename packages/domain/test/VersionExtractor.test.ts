import { describe, expect, it } from "vitest"
import { extractVersion, testPattern } from "../src/Utils/VersionExtractor.js"

describe("VersionExtractor", () => {
  describe("extractVersion", () => {
    it("should extract version from tag with v prefix", () => {
      expect(extractVersion("v1.2.3", "abc123", undefined)).toBe("1.2.3")
    })

    it("should extract version from tag without v prefix", () => {
      expect(extractVersion("1.2.3", "abc123", undefined)).toBe("1.2.3")
    })

    it("should extract version from tag with release prefix", () => {
      expect(extractVersion("release-1.2.3", "abc123", undefined)).toBe("1.2.3")
    })

    it("should extract version using custom pattern", () => {
      expect(
        extractVersion("api-server-v1.7.2", "abc123", "api-server-v?(\\d+\\.\\d+\\.\\d+)")
      ).toBe("1.7.2")
    })

    it("should extract version using service-specific pattern", () => {
      expect(
        extractVersion("frontend-2.5.1", "abc123", "frontend-(\\d+\\.\\d+\\.\\d+)")
      ).toBe("2.5.1")
    })

    it("should return tag as-is if pattern does not match", () => {
      expect(extractVersion("build-456", "abc123", undefined)).toBe("build-456")
    })

    it("should return short commit SHA if no tag provided", () => {
      expect(extractVersion(undefined, "abc123def456789", undefined)).toBe("abc123d")
    })

    it("should handle tags with multiple version-like strings", () => {
      expect(extractVersion("v1.0.0-beta-2.3.4", "abc123", undefined)).toBe("1.0.0")
    })
  })

  describe("testPattern", () => {
    it("should validate valid pattern", () => {
      const result = testPattern("v?(\\d+\\.\\d+\\.\\d+)", "v1.2.3")
      expect(result.success).toBe(true)
      expect(result.extractedVersion).toBe("1.2.3")
    })

    it("should reject pattern without capturing group", () => {
      const result = testPattern("v?\\d+\\.\\d+\\.\\d+", "v1.2.3")
      expect(result.success).toBe(false)
      expect(result.error).toContain("capturing group")
    })

    it("should reject pattern that doesn't match", () => {
      const result = testPattern("frontend-(\\d+\\.\\d+\\.\\d+)", "backend-1.2.3")
      expect(result.success).toBe(false)
      expect(result.error).toContain("does not match")
    })

    it("should reject invalid regex", () => {
      const result = testPattern("(unclosed", "test")
      expect(result.success).toBe(false)
      expect(result.error).toBeTruthy()
    })
  })
})
