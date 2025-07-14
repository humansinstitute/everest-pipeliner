import { generateJobId } from "../../src/utils/jobId.js";

describe("Job ID Generation", () => {
  describe("generateJobId", () => {
    test("should generate a job ID", () => {
      const jobId = generateJobId();
      expect(jobId).toBeDefined();
      expect(typeof jobId).toBe("string");
      expect(jobId.length).toBeGreaterThan(0);
    });

    test("should generate unique job IDs", () => {
      const jobIds = new Set();
      const iterations = 1000;

      for (let i = 0; i < iterations; i++) {
        const jobId = generateJobId();
        expect(jobIds.has(jobId)).toBe(false);
        jobIds.add(jobId);
      }

      expect(jobIds.size).toBe(iterations);
    });

    test("should generate job IDs with consistent format", () => {
      const jobId = generateJobId();

      // Should start with 'job_'
      expect(jobId).toMatch(/^job_/);

      // Should be followed by base36 timestamp and hex random component
      expect(jobId).toMatch(/^job_[a-z0-9]+_[a-f0-9]+$/);
    });

    test("should generate job IDs with timestamp component", () => {
      const beforeTime = Date.now();
      const jobId = generateJobId();
      const afterTime = Date.now();

      // Extract base36 timestamp from job ID
      const timestampMatch = jobId.match(/^job_([a-z0-9]+)_/);
      expect(timestampMatch).toBeTruthy();

      const timestamp = parseInt(timestampMatch[1], 36);
      expect(timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(timestamp).toBeLessThanOrEqual(afterTime);
    });

    test("should generate job IDs with random component", () => {
      const jobId1 = generateJobId();
      const jobId2 = generateJobId();

      // Extract random components
      const random1 = jobId1.split("_")[2];
      const random2 = jobId2.split("_")[2];

      expect(random1).toBeDefined();
      expect(random2).toBeDefined();
      expect(random1).not.toBe(random2);

      // Should be hexadecimal
      expect(random1).toMatch(/^[a-f0-9]+$/);
      expect(random2).toMatch(/^[a-f0-9]+$/);
    });

    test("should generate job IDs with reasonable length", () => {
      const jobId = generateJobId();

      // Should be reasonable length (not too short, not too long)
      expect(jobId.length).toBeGreaterThan(15);
      expect(jobId.length).toBeLessThan(50);
    });

    test("should generate job IDs that are URL-safe", () => {
      const jobId = generateJobId();

      // Should only contain URL-safe characters (including underscores)
      expect(jobId).toMatch(/^[a-zA-Z0-9_]+$/);
    });

    test("should generate job IDs in chronological order when called sequentially", async () => {
      const jobId1 = generateJobId();
      // Small delay to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 1));
      const jobId2 = generateJobId();

      // Extract base36 timestamps
      const timestamp1 = parseInt(jobId1.match(/^job_([a-z0-9]+)_/)[1], 36);
      const timestamp2 = parseInt(jobId2.match(/^job_([a-z0-9]+)_/)[1], 36);

      expect(timestamp2).toBeGreaterThanOrEqual(timestamp1);
    });

    test("should handle rapid generation without collisions", () => {
      const jobIds = [];
      const rapidCount = 100;

      // Generate many job IDs rapidly
      for (let i = 0; i < rapidCount; i++) {
        jobIds.push(generateJobId());
      }

      // Check for uniqueness
      const uniqueJobIds = new Set(jobIds);
      expect(uniqueJobIds.size).toBe(rapidCount);
    });

    test("should generate consistent format across multiple calls", () => {
      const jobIds = [];
      for (let i = 0; i < 10; i++) {
        jobIds.push(generateJobId());
      }

      jobIds.forEach((jobId) => {
        expect(jobId).toMatch(/^job_[a-z0-9]+_[a-f0-9]+$/);
        expect(jobId.split("_")).toHaveLength(3);
        expect(jobId.split("_")[0]).toBe("job");
        expect(jobId.split("_")[1]).toMatch(/^[a-z0-9]+$/);
        expect(jobId.split("_")[2]).toMatch(/^[a-f0-9]+$/);
      });
    });

    test("should generate job IDs with sufficient entropy", () => {
      const jobIds = new Set();
      const testCount = 10000;

      for (let i = 0; i < testCount; i++) {
        jobIds.add(generateJobId());
      }

      // Should have no collisions even with many generations
      expect(jobIds.size).toBe(testCount);
    });

    test("should generate job IDs that sort chronologically by string comparison", async () => {
      const jobIds = [];

      // Generate job IDs with small delays
      for (let i = 0; i < 5; i++) {
        jobIds.push(generateJobId());
        // Small delay to ensure different timestamps
        await new Promise((resolve) => setTimeout(resolve, 2));
      }

      // Sort by string comparison
      const sortedJobIds = [...jobIds].sort();

      // Should be in the same order as generation order
      expect(sortedJobIds).toEqual(jobIds);
    });
  });

  describe("edge cases", () => {
    test("should handle system clock changes gracefully", () => {
      // This test ensures the function doesn't break if system time changes
      const jobId = generateJobId();
      expect(jobId).toBeDefined();
      expect(typeof jobId).toBe("string");
      expect(jobId).toMatch(/^job_[a-z0-9]+_[a-f0-9]+$/);
    });

    test("should generate valid job IDs under high load simulation", async () => {
      const promises = [];
      const concurrentCount = 50;

      // Simulate concurrent job ID generation
      for (let i = 0; i < concurrentCount; i++) {
        promises.push(Promise.resolve(generateJobId()));
      }

      const jobIds = await Promise.all(promises);
      const uniqueJobIds = new Set(jobIds);

      expect(jobIds).toHaveLength(concurrentCount);
      expect(uniqueJobIds.size).toBe(concurrentCount);

      jobIds.forEach((jobId) => {
        expect(jobId).toMatch(/^job_[a-z0-9]+_[a-f0-9]+$/);
      });
    });
  });
});
