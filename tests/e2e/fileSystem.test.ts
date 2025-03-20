import { test, _electron as electron, expect } from "@playwright/test";
import { structuralSrcToDest } from "../../src/server/FileSystemServer";

test("structuralSrcToDest", async () => {
  const src = {
    paths: [
      "C:\\parent1\\child11",
      "C:\\parent1",
      "C:\\parent2",
      "C:\\parent1\\child12",
      "C:\\parent2\\child21",
      "C:\\parent2\\child22",
      "C:\\parent3",
    ],
  };
  const dest = { path: "D:\\" };

  const sorted = src.paths.sort();
  expect(sorted).toEqual([
    "C:\\parent1",
    "C:\\parent1\\child11",
    "C:\\parent1\\child12",
    "C:\\parent2",
    "C:\\parent2\\child21",
    "C:\\parent2\\child22",
    "C:\\parent3",
  ]);

  const result = structuralSrcToDest(src, dest);
  expect(result).toEqual([
    ["C:\\parent1\\child11", "D:\\parent1\\child11"],
    ["C:\\parent1\\child12", "D:\\parent1\\child12"],
    ["C:\\parent2\\child21", "D:\\parent2\\child21"],
    ["C:\\parent2\\child22", "D:\\parent2\\child22"],
    ["C:\\parent3", "D:\\parent3"],
  ]);
});
