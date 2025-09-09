---
title: Changelog Guide
description: "Understand version numbers and release notes for design-lint."
sidebar_position: 100
---

# Changelog Guide

This guide explains how to read the project changelog and version numbers. It targets contributors and users upgrading between releases.

## Table of contents
- [Semantic versioning](#semantic-versioning)
- [Conventional Commits](#conventional-commits)
- [Changesets](#changesets)
- [See also](#see-also)

## Semantic versioning
@lapidist/design-lint follows [semver](https://semver.org/): `MAJOR.MINOR.PATCH`.
- **MAJOR** – incompatible API changes
- **MINOR** – new functionality in a backward-compatible manner
- **PATCH** – backward-compatible bug fixes

## Conventional Commits
Commit messages use the [Conventional Commits](https://www.conventionalcommits.org/) format to generate changelog entries automatically. Example: `feat(rules): add opacity rule`.

## Changesets
Changesets describe pending releases. Each changeset file indicates the semver bump and a summary of the change. During release, the changelog is updated based on these files. See [AGENTS.md](https://github.com/bylapidist/design-lint/blob/main/AGENTS.md) for the expected format.

## See also
- [CHANGELOG](https://github.com/bylapidist/design-lint/blob/main/CHANGELOG.md)
- [Contributing](https://github.com/bylapidist/design-lint/blob/main/CONTRIBUTING.md)
