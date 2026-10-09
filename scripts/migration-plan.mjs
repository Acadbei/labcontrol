const FIELDS = {
  users: new Set(['id', 'loginId', 'staffRosterId', 'identitySource', 'name', 'email', 'role', 'position', 'avatar', 'permissions', 'phone', 'specialty', 'source', 'ownerId', 'verified', 'isDemo']),
  projects: new Set(['id', 'name', 'code', 'description', 'status', 'priority', 'startDate', 'deadline', 'managerId', 'teamIds', 'documentsCount', 'tasksCount', 'progressPercent', 'technicalParameters', 'overview', 'decisions', 'tags', 'createdAt', 'updatedAt', 'source', 'ownerId', 'verified', 'isDemo']),
  documents: new Set(['id', 'title', 'originalName', 'fileType', 'fileSize', 'storagePath', 'projectId', 'projectName', 'uploadedById', 'uploadedByName', 'uploadedAt', 'version', 'summary', 'tags', 'technicalParameters', 'pageCount', 'slideCount', 'wordCount', 'isIndexed', 'chunksCount', 'verified', 'provenance', 'verifiedById', 'verifiedByName', 'verifiedAt', 'source', 'ownerId', 'isDemo']),
  chunks: new Set(['id', 'docId', 'chunkIndex', 'text', 'pageOrSlide', 'sectionTitle', 'embedding']),
  tasks: new Set(['id', 'title', 'description', 'projectId', 'projectName', 'assigneeId', 'assigneeName', 'creatorId', 'creatorName', 'priority', 'deadline', 'status', 'aiSummary', 'comments', 'tags', 'createdAt', 'updatedAt', 'source', 'ownerId', 'verified', 'isDemo']),
  knowledge: new Set(['id', 'title', 'category', 'content', 'projectId', 'projectName', 'technicalParams', 'tags', 'updatedAt', 'ownerId', 'source', 'verified', 'isDemo']),
  auditLogs: new Set(['id', 'userId', 'userName', 'action', 'object', 'details', 'ip', 'timestamp', 'status', 'source', 'isDemo']),
  chatMessages: new Set(['id', 'role', 'content', 'senderId', 'timestamp', 'citations', 'actionProposal', 'isPersonal']),
  teamMessages: new Set(['id', 'senderId', 'senderName', 'senderPosition', 'senderRole', 'content', 'timestamp', 'category'])
};
const LEGACY_ONLY = new Set(['settings', 'currentUserId']);
const isText = value => typeof value === 'string' && value.trim().length > 0;
const isDate = value => typeof value === 'string' && !Number.isNaN(Date.parse(value));
const valuesOf = (source, key) => Array.isArray(source?.[key]) ? source[key] : [];

export function buildMigrationPlan(source) {
  if (!source || typeof source !== 'object' || Array.isArray(source)) throw new Error('Import source must be a JSON object');
  const rows = Object.fromEntries(Object.keys(FIELDS).map(table => [table, valuesOf(source, table)]));
  const rejected = Object.fromEntries(Object.keys(FIELDS).map(table => [table, new Set()]));
  const errors = [];
  const unknownFields = [];
  const piiMismatches = [];
  const reject = (table, index, reason) => {
    if (!rejected[table].has(index)) errors.push({ table, index, reason });
    rejected[table].add(index);
  };

  for (const key of Object.keys(source)) if (!Object.keys(FIELDS).includes(key) && !LEGACY_ONLY.has(key)) unknownFields.push(`source.${key}`);
  const safeSettingKeys = new Set(['aiProvider', 'modelName', 'laboratoryName', 'secondBrainTitle']);
  if (source.settings && typeof source.settings === 'object' && !Array.isArray(source.settings)) {
    for (const key of Object.keys(source.settings)) if (!safeSettingKeys.has(key)) unknownFields.push(`settings.${key}`);
  }
  for (const [table, allowed] of Object.entries(FIELDS)) rows[table].forEach((row, index) => {
    if (!row || typeof row !== 'object' || Array.isArray(row)) { reject(table, index, 'row_not_object'); return; }
    const extras = Object.keys(row).filter(key => !allowed.has(key));
    if (extras.length) {
      for (const key of extras) unknownFields.push(`${table}[${index}].${key}`);
      reject(table, index, 'unknown_field');
    }
  });

  for (const table of Object.keys(FIELDS)) {
    const seen = new Set();
    rows[table].forEach((row, index) => {
      if (rejected[table].has(index)) return;
      if (!isText(row.id)) { reject(table, index, 'missing_id'); return; }
      if (seen.has(row.id)) reject(table, index, 'duplicate_id');
      seen.add(row.id);
    });
  }
  const unique = (table, field, reason) => {
    const seen = new Set();
    rows[table].forEach((row, index) => {
      if (rejected[table].has(index) || !isText(row[field])) return;
      const value = row[field].trim().toLowerCase();
      if (seen.has(value)) reject(table, index, reason);
      seen.add(value);
    });
  };
  unique('users', 'email', 'duplicate_email');
  unique('projects', 'code', 'duplicate_project_code');
  const seenLoginIds = new Set();

  rows.users.forEach((row, index) => {
    const email = typeof row.email === 'string' ? row.email.trim().toLowerCase() : '';
    const emailValid = !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const explicitLoginId = isText(row.loginId);
    const loginId = (explicitLoginId ? row.loginId : email).trim().toLowerCase();
    const loginIdValid = explicitLoginId ? /^[a-z0-9][a-z0-9._-]{1,79}$/.test(loginId) : Boolean(email && emailValid);
    if (seenLoginIds.has(loginId) && loginId) reject('users', index, 'duplicate_login_id');
    if (loginId) seenLoginIds.add(loginId);
    if (!isText(row.name) || !emailValid || !loginIdValid || !['SUPER_ADMIN', 'ADMIN', 'USER'].includes(row.role) || !isText(row.position)) reject('users', index, 'invalid_user');
  });
  const userRows = new Map(rows.users.filter((_, index) => !rejected.users.has(index)).map(row => [row.id, row]));

  rows.projects.forEach((row, index) => {
    if (!isText(row.name) || !isText(row.code) || !userRows.has(row.managerId)) reject('projects', index, 'invalid_project_or_manager_reference');
    if (!['Planning', 'Active', 'On Hold', 'Testing', 'Completed', 'Archived'].includes(row.status) || !['Low', 'Medium', 'High', 'Critical'].includes(row.priority)) reject('projects', index, 'invalid_project_status_or_priority');
    if (row.progressPercent !== undefined && (!Number.isInteger(row.progressPercent) || row.progressPercent < 0 || row.progressPercent > 100)) reject('projects', index, 'invalid_project_progress');
    if (!Array.isArray(row.teamIds)) reject('projects', index, 'invalid_project_members');
    else if (row.teamIds.some(userId => !userRows.has(userId))) reject('projects', index, 'orphan_project_member');
  });
  const projectRows = new Map(rows.projects.filter((_, index) => !rejected.projects.has(index)).map(row => [row.id, row]));

  rows.documents.forEach((row, index) => {
    if (!isText(row.title) || !isText(row.originalName) || !userRows.has(row.uploadedById)) reject('documents', index, 'invalid_document_or_uploader_reference');
    if (row.projectId && !projectRows.has(row.projectId)) reject('documents', index, 'orphan_document_project');
    if (!['pdf', 'docx', 'pptx', 'xlsx', 'txt', 'csv'].includes(row.fileType)) reject('documents', index, 'unsupported_file_type');
    if (!Number.isFinite(row.fileSize) || row.fileSize < 0 || !isDate(row.uploadedAt)) reject('documents', index, 'invalid_document_metadata');
    if (row.storagePath) reject('documents', index, 'external_file_asset_requires_separate_import');
    if (row.verified === true && (row.isDemo === true || !isText(row.provenance) || !isText(row.verifiedById) || !userRows.has(row.verifiedById))) reject('documents', index, 'verified_document_missing_traceable_provenance');
    const uploader = userRows.get(row.uploadedById);
    if (uploader && row.uploadedByName && row.uploadedByName !== uploader.name) piiMismatches.push(`${tablePath('documents', index, 'uploadedByName')}`);
  });
  const documentRows = new Map(rows.documents.filter((_, index) => !rejected.documents.has(index)).map(row => [row.id, row]));
  const chunkKeys = new Set();
  rows.chunks.forEach((row, index) => {
    const compound = `${row.docId}|${row.chunkIndex}`;
    if (chunkKeys.has(compound)) reject('chunks', index, 'duplicate_document_chunk_index');
    chunkKeys.add(compound);
    if (!documentRows.has(row.docId)) reject('chunks', index, 'orphan_chunk_document');
    if (!Number.isInteger(row.chunkIndex) || row.chunkIndex < 0 || !isText(row.text)) reject('chunks', index, 'invalid_chunk');
  });

  rows.tasks.forEach((row, index) => {
    const assignee = userRows.get(row.assigneeId);
    const creator = userRows.get(row.creatorId);
    const project = projectRows.get(row.projectId);
    if (!isText(row.title)) reject('tasks', index, 'invalid_task_title');
    if (!project) reject('tasks', index, 'orphan_task_project');
    else if (Array.isArray(project.teamIds) && !project.teamIds.includes(row.assigneeId)) reject('tasks', index, 'assignee_not_project_member');
    if (!assignee || !creator) reject('tasks', index, 'orphan_task_user');
    if (!['Low', 'Medium', 'High', 'Critical'].includes(row.priority) || !['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'].includes(row.status) || !isDate(row.deadline)) reject('tasks', index, 'invalid_task_status_priority_or_deadline');
    if (assignee && row.assigneeName && row.assigneeName !== assignee.name) piiMismatches.push(tablePath('tasks', index, 'assigneeName'));
    if (creator && row.creatorName && row.creatorName !== creator.name) piiMismatches.push(tablePath('tasks', index, 'creatorName'));
  });
  rows.knowledge.forEach((row, index) => {
    if (!isText(row.title) || !isText(row.content) || !['Standard', 'Specification', 'Hardware', 'Software', 'CAD/3D', 'Research'].includes(row.category)) reject('knowledge', index, 'invalid_knowledge_item');
    if (row.projectId && !projectRows.has(row.projectId)) reject('knowledge', index, 'orphan_knowledge_project');
    if (row.ownerId && !userRows.has(row.ownerId)) reject('knowledge', index, 'orphan_knowledge_owner');
  });
  rows.chatMessages.forEach((row, index) => {
    if (!userRows.has(row.senderId)) reject('chatMessages', index, 'orphan_chat_owner');
    if (!['user', 'assistant', 'system'].includes(row.role) || !isText(row.content)) reject('chatMessages', index, 'invalid_chat_message');
  });
  rows.teamMessages.forEach((row, index) => {
    if (!userRows.has(row.senderId)) reject('teamMessages', index, 'orphan_team_sender');
    if (!['SUPER_ADMIN', 'ADMIN', 'USER'].includes(row.senderRole) || !isText(row.content)) reject('teamMessages', index, 'invalid_team_message');
  });
  rows.auditLogs.forEach((row, index) => {
    const actor = userRows.get(row.userId);
    if (actor && row.userName && row.userName !== actor.name) piiMismatches.push(tablePath('auditLogs', index, 'userName'));
    if (row.status && !['SUCCESS', 'WARNING', 'FAILED'].includes(row.status)) reject('auditLogs', index, 'invalid_audit_status');
  });

  const accepted = Object.fromEntries(Object.keys(FIELDS).map(table => [table, rows[table].filter((_, index) => !rejected[table].has(index))]));
  const counts = Object.fromEntries(Object.keys(FIELDS).map(table => [table, { input: rows[table].length, accepted: accepted[table].length, rejected: rejected[table].size }]));
  const distinctUnknownFields = [...new Set(unknownFields)];
  return {
    rows: accepted,
    errors,
    counts,
    unknownFields: distinctUnknownFields,
    piiMismatches,
    totals: {
      input: Object.values(rows).reduce((sum, items) => sum + items.length, 0),
      accepted: Object.values(accepted).reduce((sum, items) => sum + items.length, 0),
      rejected: Object.values(rejected).reduce((sum, indexes) => sum + indexes.size, 0),
      duplicateRows: errors.filter(item => item.reason.startsWith('duplicate_')).length,
      orphanRows: errors.filter(item => item.reason.startsWith('orphan_')).length,
      piiMismatchCount: piiMismatches.length,
      unknownFieldCount: distinctUnknownFields.length,
      excludedLegacyIdentity: Object.hasOwn(source, 'currentUserId')
    }
  };
}

function tablePath(table, index, field) { return `${table}[${index}].${field}`; }
