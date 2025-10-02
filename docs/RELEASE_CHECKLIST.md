# Release Checklist - Grocery POS

This checklist ensures a consistent, reliable release process for the Grocery POS application.

## 📋 Pre-flight Checks

### Code Quality & Testing
- [ ] **All tickets for the milestone moved to "Ready to Release"**
- [ ] **`main` branch is green on CI** (lint, type-check, smoke tests, e2e tests)
- [ ] **`npm run qa:full` passes locally** (reset + smoke + e2e)
- [ ] **No critical or high-severity bugs** in the current milestone
- [ ] **All merge conflicts resolved** and branch is up-to-date

### Documentation & Dependencies
- [ ] **README.md is current** with any new features or setup changes
- [ ] **API documentation updated** (if applicable)
- [ ] **Dependencies reviewed** for security vulnerabilities (`npm audit`)
- [ ] **Breaking changes documented** in migration guide

---

## 🏷️ Versioning & Release Notes

### Version Bump
- [ ] **Determine version type**: `patch` (bugs) | `minor` (features) | `major` (breaking)
- [ ] **Run version bump script:**
  ```bash
  npm run version:bump -- <patch|minor|major>
  ```
- [ ] **Verify package.json version updated** correctly
- [ ] **Verify CHANGELOG.md has new section** with current date

### Release Notes
- [ ] **Update `docs/RELEASE_NOTES_TEMPLATE.md`** with:
  - [ ] Key highlights and new features
  - [ ] Important bug fixes
  - [ ] Breaking changes or migrations needed
  - [ ] Known issues or limitations
- [ ] **Generate changelog entries:**
  ```bash
  npm run release:notes -- --finalize vX.Y.Z
  ```
- [ ] **Review generated CHANGELOG.md** for accuracy and completeness

### Git Operations
- [ ] **Follow git commands from version bump output:**
  ```bash
  git add .
  git commit -m "chore(release): vX.Y.Z"
  git tag vX.Y.Z
  git push --follow-tags
  ```

---

## 🏗️ Build & Packaging

### Production Build
- [ ] **Clean previous builds:**
  ```bash
  rm -rf dist/
  ```
- [ ] **Run production build:**
  ```bash
  npm run build:prod
  ```
- [ ] **Verify build completes without warnings**
- [ ] **Check dist/ folder contains expected files**

### Local Production Testing
- [ ] **Start production server:**
  ```bash
  npm run serve:prod
  ```
- [ ] **Run health check:**
  ```bash
  npm run release:check
  ```
- [ ] **Verify health check returns exit code 0**

### Docker Packaging
- [ ] **Build Docker image:**
  ```bash
  npm run docker:build
  ```
- [ ] **Verify image builds successfully**
- [ ] **Run containerized application:**
  ```bash
  npm run docker:run
  ```
- [ ] **Verify app serves at http://localhost:8080**

---

## 🧪 Production Smoke Testing

### Core Functionality (5-10 minutes)
- [ ] **Navigate to /** - loads Sales screen without errors
- [ ] **Add items to sale** - SKU lookup and quantity work
- [ ] **Process payment** - cash/card payment completes
- [ ] **Print receipt** - receipt preview displays correctly

### Settings Integration
- [ ] **Settings → Language & Formatting** - change rounding mode
- [ ] **Navigate to Reports** - verify rounding reflected immediately
- [ ] **Settings → Store Info** - update store name
- [ ] **Process sale → Receipt** - verify store name appears

### Discounts & Advanced Features
- [ ] **Add discount-eligible items** (Sugar 3kg+, Produce items)
- [ ] **Verify discounts apply** with correct caps and messages
- [ ] **Test CSV export/import** on Products page

### Backups (Production Sanity)
- [ ] **Configure backup provider** in Settings → Backups
- [ ] **Set encryption key** (use strong production key)
- [ ] **Test connection** shows ✅ success
- [ ] **Create manual backup** completes successfully
- [ ] **Run "Verify Last"** passes checksum validation

---

## 🚀 Release Deployment

### GitHub Release
- [ ] **Create GitHub Release** with tag vX.Y.Z
- [ ] **Copy release notes** from CHANGELOG.md
- [ ] **Attach build artifacts** (if applicable):
  - [ ] `dist.zip` (production build)
  - [ ] Docker image reference
  - [ ] Installation/upgrade instructions

### Container Registry (Optional)
- [ ] **Tag Docker image** for registry:
  ```bash
  docker tag grocery-pos:latest registry/grocery-pos:vX.Y.Z
  docker tag grocery-pos:latest registry/grocery-pos:latest
  ```
- [ ] **Push to registry:**
  ```bash
  docker push registry/grocery-pos:vX.Y.Z
  docker push registry/grocery-pos:latest
  ```

### Deployment Documentation
- [ ] **Update deployment docs** with new version requirements
- [ ] **Document environment variable changes** (if any)
- [ ] **Provide migration instructions** for breaking changes
- [ ] **Update Docker Compose examples** with new image version

---

## 📊 Post-Release Monitoring

### Immediate Checks (First Hour)
- [ ] **Monitor deployment logs** for errors
- [ ] **Verify application starts** without crashes
- [ ] **Test critical user flows** in production environment
- [ ] **Check backup systems** are functioning
- [ ] **Monitor performance metrics** (if available)

### Follow-up Actions
- [ ] **Create "Next Release" milestone** in project management
- [ ] **Move any deferred tickets** to next milestone
- [ ] **Update project documentation** with new version
- [ ] **Notify stakeholders** of successful release
- [ ] **Schedule post-release review** (if needed)

---

## 🔍 Quality Gates

### Mandatory Gates (Must Pass)
- ✅ **CI/CD Pipeline:** All automated tests pass
- ✅ **Health Check:** Production build serves correctly
- ✅ **Core Functionality:** POS workflow completes end-to-end
- ✅ **Settings Integration:** Changes reflect across modules
- ✅ **Backup System:** Manual backup and verification work

### Recommended Gates (Should Pass)
- ⚠️ **Performance:** Page load times under 3 seconds
- ⚠️ **Memory Usage:** No significant memory leaks detected
- ⚠️ **Browser Compatibility:** Works in Chrome, Firefox, Safari
- ⚠️ **Mobile Responsiveness:** Usable on tablet devices
- ⚠️ **Accessibility:** Basic keyboard navigation works

---

## 🆘 Rollback Procedure

### If Critical Issues Found Post-Release

1. **Immediate Actions:**
   - [ ] **Stop deployment** if in progress
   - [ ] **Document the issue** with reproduction steps
   - [ ] **Assess impact** (data loss risk, user impact)

2. **Rollback Decision:**
   - [ ] **Minor issues:** Create hotfix branch, patch, and re-release
   - [ ] **Major issues:** Rollback to previous version

3. **Rollback Execution:**
   ```bash
   # Revert to previous Docker image
   docker tag registry/grocery-pos:vX.Y.Z-1 registry/grocery-pos:latest
   docker push registry/grocery-pos:latest
   
   # Or revert git tag and rebuild
   git tag -d vX.Y.Z
   git push --delete origin vX.Y.Z
   ```

4. **Communication:**
   - [ ] **Notify stakeholders** immediately
   - [ ] **Update GitHub release** with known issues
   - [ ] **Plan hotfix timeline** and communicate to users

---

## 📝 Release Sign-off

| Role | Name | Date | Signature | Notes |
|------|------|------|-----------|-------|
| **Developer** | | | | Code complete, tests pass |
| **QA Lead** | | | | Manual testing complete |
| **Product Owner** | | | | Features approved |
| **DevOps/Release Manager** | | | | Deployment successful |

### Final Checklist
- [ ] **All quality gates passed**
- [ ] **Documentation updated**
- [ ] **Stakeholders notified**
- [ ] **Monitoring in place**
- [ ] **Next milestone planned**

---

## 📞 Emergency Contacts

| Role | Contact | Availability |
|------|---------|-------------|
| **Primary Developer** | | 24/7 for critical issues |
| **DevOps Engineer** | | Business hours + on-call |
| **Product Manager** | | Business hours |
| **Support Lead** | | Business hours |

---

## 📚 Reference Links

- **Project Repository:** [GitHub Link]
- **CI/CD Pipeline:** [GitHub Actions Link]
- **Container Registry:** [Registry Link]
- **Production Environment:** [App URL]
- **Monitoring Dashboard:** [Monitoring Link]
- **Documentation Site:** [Docs Link]

---

**Release Completed:** _______________  
**Released By:** _______________  
**Version:** vX.Y.Z  
**Release Notes:** See CHANGELOG.md



