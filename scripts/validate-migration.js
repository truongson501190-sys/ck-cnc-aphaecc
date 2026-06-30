#!/usr/bin/env node

import { readFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import Ajv from 'ajv'

const validateMigration = async (dataPath, schemaPath) => {
  const schema = JSON.parse(readFileSync(schemaPath, 'utf8'))
  const data = JSON.parse(await readFile(dataPath, 'utf8'))

  const ajv = new Ajv({ allErrors: true })
  const validate = ajv.compile(schema)
  const valid = validate(data)

  if (!valid) {
    console.error('❌ Validation failed:\n')
    validate.errors.forEach((error, i) => {
      console.error(`${i + 1}. ${error.dataPath || 'root'}: ${error.message}`)
      if (error.params) console.error(`   Params:`, error.params)
    })
    return false
  }

  // Additional custom validations
  const warnings = []

  // Check msnv uniqueness
  if (data.users) {
    const userMsnv = new Set()
    data.users.forEach(user => {
      if (userMsnv.has(user.msnv)) {
        warnings.push(`Duplicate msnv in users: ${user.msnv}`)
      }
      userMsnv.add(user.msnv)
    })
  }

  if (data.user_records) {
    const recordMsnv = new Set()
    data.user_records.forEach(record => {
      if (recordMsnv.has(record.msnv)) {
        warnings.push(`Duplicate msnv in user_records: ${record.msnv}`)
      }
      recordMsnv.add(record.msnv)
    })
  }

  // Check that user_records.msnv exists in users
  if (data.users && data.user_records) {
    const userMsnv = new Set(data.users.map(u => u.msnv))
    data.user_records.forEach(record => {
      if (!userMsnv.has(record.msnv)) {
        warnings.push(`user_records msnv not found in users: ${record.msnv}`)
      }
    })
  }

  // Check permission references
  if (data.users && data.user_permissions) {
    const userMsnv = new Set(data.users.map(u => u.msnv))
    data.user_permissions.forEach((perm, idx) => {
      if (!userMsnv.has(perm.msnv)) {
        warnings.push(`user_permissions[${idx}] references unknown msnv: ${perm.msnv}`)
      }
    })
  }

  // Check role_permissions references
  if (data.roles && data.roles_permissions) {
    const roleKeys = new Set(data.roles.map(r => r.role_key))
    data.roles_permissions.forEach((rp, idx) => {
      if (!roleKeys.has(rp.role_key)) {
        warnings.push(`roles_permissions[${idx}] references unknown role_key: ${rp.role_key}`)
      }
    })
  }

  if (warnings.length > 0) {
    console.warn('\n⚠️  Warnings (may indicate data issues):\n')
    warnings.forEach((w, i) => console.warn(`${i + 1}. ${w}`))
  }

  return true
}

const printStats = async (dataPath) => {
  const data = JSON.parse(await readFile(dataPath, 'utf8'))

  console.log('\n📊 Migration data summary:')
  console.log(`  users: ${data.users?.length ?? 0}`)
  console.log(`  user_records: ${data.user_records?.length ?? 0}`)
  console.log(`  user_permissions: ${data.user_permissions?.length ?? 0}`)
  console.log(`  roles_permissions: ${data.roles_permissions?.length ?? 0}`)
  console.log(`  roles: ${data.roles?.length ?? 0}`)
  console.log(`  user_roles: ${data.user_roles?.length ?? 0}`)
}

const main = async () => {
  const args = process.argv.slice(2)
  const dataPath = args[0] || 'data/user-migration.json'
  const schemaPath = args[1] || 'data/user-migration.schema.json'

  try {
    console.log(`Validating: ${dataPath}`)
    const valid = await validateMigration(dataPath, schemaPath)

    if (valid) {
      console.log('\n✅ Validation passed!')
      await printStats(dataPath)
    } else {
      process.exit(1)
    }
  } catch (error) {
    console.error('Validation error:', error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

main()
