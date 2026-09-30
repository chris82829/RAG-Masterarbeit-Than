import process from 'node:process'
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'postgresql',
  schema: './server/lib/db/schema',
  dbCredentials: { url: process.env.DATABASE_URL as string },
  schemaFilter: ['public'],
  tablesFilter: [
    '!spatial_ref_sys',
    '!geography_columns',
    '!geometry_columns',
    '!raster_columns',
    '!raster_overviews',
    '!pg_stat_statements*',
  ],
})
