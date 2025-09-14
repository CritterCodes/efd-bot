// This file is used to provide workspace-specific custom instructions to Copilot.
// Project: efdBot - Discord bot for EngelFineDesign
// Language: JavaScript
// Features: Discord.js v14, slash commands, GEMS currency, verification system
// Setup: See README.md for instructions

## 📋 Development Workflow with Phase Tracking

### Phase-Based Development
- ALWAYS reference `docs/ROADMAP.md` for overall project vision and current phase
- ALWAYS check current phase tracker in `docs/phases/` before starting work
- NEVER mark tasks complete until comprehensive testing is finished
- NEVER mark phases complete until all tasks are validated and tested

### Current Phase: Phase 1 - GEMS Currency System
- **Phase Tracker**: `docs/phases/PHASE_1_GEMS.md`
- **Status**: 🚧 IN PLANNING
- **Dependencies**: Phase 0 (Foundation) ✅ COMPLETED

### Task Management Protocol
1. **Before Starting Work**:
   - Read relevant phase tracker completely
   - Mark ONE specific task as `⬜ IN PROGRESS`
   - Update task status with start date and progress notes

2. **During Development**:
   - Follow exact task requirements in phase tracker
   - Reference testing requirements for each task
   - Keep task status updated with progress

3. **Before Marking Complete**:
   - Complete ALL testing requirements listed in task
   - Verify functionality meets success criteria
   - Update phase tracker with completion date
   - Mark task as `✅ COMPLETED` only after testing validation

4. **Phase Completion**:
   - ALL tasks must be ✅ COMPLETED with testing validation
   - ALL checkpoints must be passed
   - ALL success criteria must be met
   - Phase marked complete only after full system verification

### Quality Standards
- **Testing First**: No task complete without passing all listed tests
- **Documentation**: All code changes must include JSDoc comments
- **Security**: All user inputs validated, all secrets in environment variables
- **Performance**: All commands respond within 2 seconds, database queries under 500ms

### File Organization Reference
- Main bot: `src/index.js`
- Commands: `src/commands/`
- Libraries: `src/lib/`
- Database: `src/lib/database.js`, `src/lib/constants.js`
- Tests: `tests/` (to be created in Phase 1)
- Documentation: `docs/`, phase trackers in `docs/phases/`

### Current Development Priorities
1. **Phase 1 Task 1.1**: GEMS database schema design and implementation
2. **Testing Framework**: Set up comprehensive testing for all new features
3. **Documentation**: Maintain JSDoc standards and user documentation

### Never Skip
- Reading the complete phase tracker before starting
- Testing requirements verification before marking complete
- Phase completion criteria validation
- Roadmap alignment verification for all new features
