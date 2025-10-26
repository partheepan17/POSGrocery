"use strict";
/**
 * Access Control Module
 * Exports all access control utilities and services
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DependencyError = exports.dependencyManager = exports.FeatureDependencyManager = exports.AccessPolicyError = exports.accessPolicy = exports.AccessPolicy = exports.featureCache = exports.FeatureCache = void 0;
var FeatureCache_1 = require("./FeatureCache");
Object.defineProperty(exports, "FeatureCache", { enumerable: true, get: function () { return FeatureCache_1.FeatureCache; } });
Object.defineProperty(exports, "featureCache", { enumerable: true, get: function () { return FeatureCache_1.featureCache; } });
var policy_1 = require("./policy");
Object.defineProperty(exports, "AccessPolicy", { enumerable: true, get: function () { return policy_1.AccessPolicy; } });
Object.defineProperty(exports, "accessPolicy", { enumerable: true, get: function () { return policy_1.accessPolicy; } });
Object.defineProperty(exports, "AccessPolicyError", { enumerable: true, get: function () { return policy_1.AccessPolicyError; } });
var dependency_1 = require("./dependency");
Object.defineProperty(exports, "FeatureDependencyManager", { enumerable: true, get: function () { return dependency_1.FeatureDependencyManager; } });
Object.defineProperty(exports, "dependencyManager", { enumerable: true, get: function () { return dependency_1.dependencyManager; } });
Object.defineProperty(exports, "DependencyError", { enumerable: true, get: function () { return dependency_1.DependencyError; } });
