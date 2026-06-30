import { readFile } from 'node:fs/promises'
import { createClient } from '@supabase/supabase-js'

const REQUIRED_ENV = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']

const getEnv = () => {
  const env = {
    supabaseUrl: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY,
  }

  const hasUrl = Boolean(env.supabaseUrl)
  const hasKey = Boolean(env.supabaseKey)
  if (!hasUrl || !hasKey) {
    const missing = []
    if (!hasUrl) missing.push('SUPABASE_URL or VITE_SUPABASE_URL')
    if (!hasKey) missing.push('SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_SERVICE_ROLE_KEY')
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}.\n` +
      `Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running.`
    )
  }

  return env
}

const parseArgs = () => {
  const args = process.argv.slice(2)
  const options = {
    input: null,
    mode: 'dry-run',
    reportFile: null,
    debug: false,
  }

  for (const arg of args) {
    if (arg.startsWith('--input=')) options.input = arg.split('=')[1]
    if (arg === '--prod' || arg === '--production') options.mode = 'prod'
    if (arg.startsWith('--mode=')) options.mode = arg.split('=')[1]
    if (arg.startsWith('--report-file=')) options.reportFile = arg.split('=')[1]
    if (arg === '--debug') options.debug = true
  }

  if (!options.input) {
    throw new Error('Missing required argument: --input=<path/to/user-export.json>')
  }

  if (!['dry-run', 'prod', 'production'].includes(options.mode)) {
    throw new Error('Invalid mode. Use --mode=dry-run or --mode=prod')
  }

  return options
}

const tables = {
  users: ['msnv', 'full_name', 'department', 'position', 'role', 'role_group', 'status', 'created_at', 'updated_at'],
  user_records: ['msnv', 'full_name', 'department', 'position', 'role', 'status', 'password_hash', 'created_at', 'last_login', 'updated_at'],
  user_permissions: ['msnv', 'module_key', 'can_view', 'can_add', 'can_edit', 'can_delete', 'can_approve', 'can_export', 'created_at', 'updated_at'],
  roles_permissions: ['role_key', 'module_key', 'can_view', 'can_add', 'can_edit', 'can_delete', 'can_approve', 'can_export', 'created_at', 'updated_at'],
}

const normalizeBooleanStatus = value => {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (['true', '1', 'yes', 'active'].includes(normalized)) return true
    if (['false', '0', 'no', 'inactive'].includes(normalized)) return false
  }
  return null
}

const normalizeStringStatus = value => {
  if (typeof value !== 'string') return value === true ? 'active' : 'inactive'
  const normalized = value.trim().toLowerCase()
  if (normalized === 'active' || normalized === 'inactive') return normalized
  return value
}

const normalizeUser = raw => ({
  msnv: String(raw.msnv || raw.MSNV || raw.id || '').trim(),
  full_name: String(raw.fullName || raw.full_name || raw.name || '').trim(),
  department: raw.department || raw.dept || raw.phong_ban || null,
  position: raw.position || raw.chuc_vu || null,
  role: String(raw.role || 'user').trim(),
  role_group: String(raw.roleGroup || raw.role_group || '').trim() || null,
  status: normalizeStringStatus(raw.status ?? 'active'),
  created_at: raw.createdAt || raw.created_at || null,
  updated_at: raw.updatedAt || raw.updated_at || null,
})

const normalizeUserRecord = raw => {
  const status = normalizeBooleanStatus(raw.status ?? raw.statusBoolean ?? raw.active ?? true)
  if (status === null) {
    throw new Error(`Unable to normalize boolean status for user_record ${JSON.stringify(raw)}`)
  }

  return {
    msnv: String(raw.msnv || raw.MSNV || raw.id || '').trim(),
    full_name: String(raw.fullName || raw.full_name || raw.name || '').trim(),
    department: raw.department || raw.dept || raw.phong_ban || null,
    position: raw.position || raw.chuc_vu || null,
    role: String(raw.role || 'user').trim(),
    status,
    password_hash: String(raw.password_hash || raw.passwordHash || raw.password || '').trim(),
    created_at: raw.createdAt || raw.created_at || null,
    last_login: raw.lastLogin || raw.last_login || null,
    updated_at: raw.updatedAt || raw.updated_at || null,
  }
}

const normalizeRolePermission = raw => ({
  role_key: String(raw.roleKey || raw.role_key || raw.role || '').trim(),
  module_key: String(raw.moduleKey || raw.module_key || raw.module || '').trim(),
  can_view: !!raw.can_view || !!raw.canView || false,
  can_add: !!raw.can_add || !!raw.canAdd || false,
  can_edit: !!raw.can_edit || !!raw.canEdit || false,
  can_delete: !!raw.can_delete || !!raw.canDelete || false,
  can_approve: !!raw.can_approve || !!raw.canApprove || false,
  can_export: !!raw.can_export || !!raw.canExport || false,
  created_at: raw.createdAt || raw.created_at || null,
  updated_at: raw.updatedAt || raw.updated_at || null,
})

const normalizeUserPermission = raw => ({
  msnv: String(raw.msnv || raw.MSNV || raw.id || '').trim(),
  module_key: String(raw.moduleKey || raw.module_key || raw.module || '').trim(),
  can_view: !!raw.can_view || !!raw.canView || false,
  can_add: !!raw.can_add || !!raw.canAdd || false,
  can_edit: !!raw.can_edit || !!raw.canEdit || false,
  can_delete: !!raw.can_delete || !!raw.canDelete || false,
  can_approve: !!raw.can_approve || !!raw.canApprove || false,
  can_export: !!raw.can_export || !!raw.canExport || false,
  created_at: raw.createdAt || raw.created_at || null,
  updated_at: raw.updatedAt || raw.updated_at || null,
})

const sanitizeRow = (row, allowedColumns) => {
  const sanitized = {}
  for (const column of allowedColumns) {
    if (row[column] !== undefined && row[column] !== null) {
      sanitized[column] = row[column]
    }
  }
  return sanitized
}

const validateTableSchema = async (supabase, tableName, requiredColumns) => {
  const columnsToCheck = requiredColumns.join(',')
  const { data, error } = await supabase
    .from(tableName)
    .select(columnsToCheck, { head: true, count: 'exact' })
    .limit(1)

  if (error) {
    if (error.details?.includes('column') || error.message?.includes('column')) {
      const missing = requiredColumns.filter(col => error.message.includes(col) || error.details?.includes(col))
      return { exists: true, missing: missing.length > 0 ? missing : requiredColumns }
    }
    throw new Error(`Unable to validate schema for table ${tableName}: ${error.message}`)
  }

  return { exists: true, missing: [] }
}

const ensureTableAndSchema = async (supabase, tableName, requiredColumns) => {
  try {
    const { exists, missing } = await validateTableSchema(supabase, tableName, requiredColumns)
    if (!exists) {
      throw new Error(`Required table not found: ${tableName}`)
    }
    if (missing.length > 0) {
      throw new Error(`Table ${tableName} is missing required columns: ${missing.join(', ')}`)
    }
    return true
  } catch (error) {
    if (error.message.includes('relation') || error.message.includes('does not exist')) {
      throw new Error(`Required table not found: ${tableName}`)
    }
    throw error
  }
}

const loadInput = async inputPath => {
  const raw = await readFile(inputPath, 'utf8')
  return JSON.parse(raw)
}

const formatResult = result => {
  if (!result || result.error) {
    return {
      success: false,
      error: result?.error?.message || 'Unknown error',
      details: result?.error || null,
    }
  }
  return {
    success: true,
    count: result.data?.length ?? 0,
    data: result.data,
  }
}

const upsertTable = async ({ supabase, table, rows, onConflict, mode, debug }) => {
  const result = {
    table,
    requested: rows.length,
    inserted: 0,
    updated: 0,
    skipped: 0,
    errors: [],
    existingKeys: [],
    pendingKeys: [],
  }

  if (rows.length === 0) {
    return result
  }

  if (mode === 'dry-run') {
    // Determine existing keys in a non-destructive dry run.
    const keyField = Array.isArray(onConflict) ? onConflict : [onConflict]
    const selectFields = keyField.join(',')
    const filterList = rows.map(row => keyField.reduce((acc, key) => ({ ...acc, [key]: row[key] }), {}))

    const existing = new Set()
    if (keyField.length === 1) {
      const values = rows.map(row => row[keyField[0]]).filter(Boolean)
      const { data, error } = await supabase.from(table).select(selectFields).in(keyField[0], values)
      if (error) {
        throw new Error(`Dry-run select failed for ${table}: ${error.message}`)
      }
      ;(data || []).forEach(item => existing.add(String(item[keyField[0]])))
      result.existingKeys = [...existing]
      result.inserted = rows.length - existing.size
      result.updated = existing.size
      result.skipped = 0
    } else {
      const { data, error } = await supabase.from(table).select(selectFields)
      if (error) {
        throw new Error(`Dry-run select failed for ${table}: ${error.message}`)
      }
      const existingSet = new Set(
        (data || []).map(item => keyField.map(key => String(item[key])).join('||'))
      )
      result.existingKeys = [...existingSet]
      rows.forEach(row => {
        const key = keyField.map(k => String(row[k])).join('||')
        if (existingSet.has(key)) {
          result.updated += 1
        } else {
          result.inserted += 1
        }
      })
    }

    if (debug) {
      console.log(`Dry-run analysis for ${table}:`, {
        requested: rows.length,
        inserted: result.inserted,
        updated: result.updated,
      })
    }
    return result
  }

  const { error, data } = await supabase.from(table).upsert(rows, {
    onConflict,
    ignoreDuplicates: false,
  })

  if (error) {
    result.errors.push({ message: error.message, details: error.details, hint: error.hint })
    return result
  }

  result.inserted = data?.length ?? 0
  result.updated = data?.length ?? 0
  return result
}

const runMigration = async (options) => {
  const env = getEnv()
  const { input, mode, reportFile, debug } = options
  const supabase = createClient(env.supabaseUrl, env.supabaseKey, {
    auth: {
      persistSession: false,
    },
  })

  console.log(`\nSupabase User Migration Script`)
  console.log(`Mode: ${mode}`)
  console.log(`Input file: ${input}`)

  const payload = await loadInput(input)

  const rawUsers = Array.isArray(payload.users) ? payload.users : []
  const rawUserRecords = Array.isArray(payload.user_records) ? payload.user_records : []
  const rawUserPermissions = Array.isArray(payload.user_permissions) ? payload.user_permissions : []
  const rawRolePermissions = Array.isArray(payload.roles_permissions) ? payload.roles_permissions : []

  if (rawUsers.length === 0 && rawUserRecords.length === 0 && rawUserPermissions.length === 0 && rawRolePermissions.length === 0) {
    throw new Error('Input payload contains no recognized records. Expected users, user_records, user_permissions, or roles_permissions arrays.')
  }

  console.log('Validating schema and required tables...')
  await ensureTableAndSchema(supabase, 'users', tables.users)
  await ensureTableAndSchema(supabase, 'user_records', tables.user_records)
  await ensureTableAndSchema(supabase, 'roles_permissions', tables.roles_permissions)
  await ensureTableAndSchema(supabase, 'user_permissions', tables.user_permissions)

  const users = rawUsers.map(normalizeUser).filter(row => row.msnv && row.full_name)
  const userRecords = rawUserRecords
    .map(raw => {
      const normalized = normalizeUserRecord(raw)
      if (!normalized.password_hash) {
        throw new Error(`user_records entry is missing password_hash for msnv=${normalized.msnv}`)
      }
      return normalized
    })
    .filter(row => row.msnv && row.full_name)
  const userPermissions = rawUserPermissions.map(normalizeUserPermission).filter(row => row.msnv && row.module_key)
  const rolePermissions = rawRolePermissions.map(normalizeRolePermission).filter(row => row.role_key && row.module_key)

  const sanitizedUsers = users.map(user => sanitizeRow(user, tables.users))
  const sanitizedUserRecords = userRecords.map(record => sanitizeRow(record, tables.user_records))
  const sanitizedUserPermissions = userPermissions.map(permission => sanitizeRow(permission, tables.user_permissions))
  const sanitizedRolePermissions = rolePermissions.map(permission => sanitizeRow(permission, tables.roles_permissions))

  const operations = []

  if (sanitizedRolePermissions.length > 0) {
    operations.push({
      label: 'roles_permissions',
      table: 'roles_permissions',
      rows: sanitizedRolePermissions,
      onConflict: ['role_key', 'module_key'],
    })
  }

  if (sanitizedUsers.length > 0) {
    operations.push({
      label: 'users',
      table: 'users',
      rows: sanitizedUsers,
      onConflict: 'msnv',
    })
  }

  if (sanitizedUserRecords.length > 0) {
    operations.push({
      label: 'user_records',
      table: 'user_records',
      rows: sanitizedUserRecords,
      onConflict: 'msnv',
    })
  }

  if (sanitizedUserPermissions.length > 0) {
    operations.push({
      label: 'user_permissions',
      table: 'user_permissions',
      rows: sanitizedUserPermissions,
      onConflict: ['msnv', 'module_key'],
    })
  }

  const results = []

  for (const op of operations) {
    console.log(`\nProcessing ${op.label}: ${op.rows.length} records`)
    const result = await upsertTable({
      supabase,
      table: op.table,
      rows: op.rows,
      onConflict: op.onConflict,
      mode,
      debug,
    })
    results.push({ ...op, result })
    if (result.errors.length > 0) {
      console.error(`Errors encountered during ${op.label}:`, result.errors)
      if (mode !== 'dry-run') {
        console.error('Migration stopped due to errors. Fix input or schema and re-run.')
        process.exit(1)
      }
    }
  }

  console.log('\nMigration summary:')
  for (const item of results) {
    const { label, result } = item
    console.log(`- ${label}: requested=${result.requested}, inserted=${result.inserted}, updated=${result.updated}, errors=${result.errors.length}`)
  }

  const report = {
    mode,
    inputFile: input,
    timestamp: new Date().toISOString(),
    stats: results.map(item => ({
      table: item.label,
      requested: item.result.requested,
      inserted: item.result.inserted,
      updated: item.result.updated,
      existingKeys: item.result.existingKeys,
      errors: item.result.errors,
    })),
  }

  if (reportFile) {
    await import('node:fs').then(({ writeFile }) =>
      writeFile(reportFile, JSON.stringify(report, null, 2), 'utf8')
    )
    console.log(`Report written to ${reportFile}`)
  }

  if (mode === 'dry-run') {
    console.log('\nDry-run complete. No changes were written to Supabase.')
  } else {
    console.log('\nProduction run complete. Review the report and validate migrated data.')
  }

  return report
}

const main = async () => {
  try {
    const options = parseArgs()
    await runMigration(options)
  } catch (error) {
    console.error('Migration script failed:', error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

main()
