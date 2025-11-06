// Example Knex migration (not wired into project) to create businesses table and add business_id to templates
exports.up = function (knex) {
  return knex.schema
    .createTable('businesses', function (table) {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.string('google_review_url');
      table.string('logo_url');
      table.text('welcome_message');
      table.timestamp('created_at').defaultTo(knex.fn.now());
    })
    .then(() =>
      knex.schema.hasTable('review_templates').then((exists) => {
        if (exists) {
          return knex.schema.table('review_templates', function (table) {
            table.integer('business_id').unsigned().notNullable().defaultTo(1);
            table.foreign('business_id').references('businesses.id').onDelete('CASCADE');
          });
        }
      })
    )
    .then(() =>
      knex.schema.hasTable('archived_templates').then((exists) => {
        if (exists) {
          return knex.schema.table('archived_templates', function (table) {
            table.integer('business_id').unsigned().notNullable().defaultTo(1);
            table.foreign('business_id').references('businesses.id').onDelete('CASCADE');
          });
        }
      })
    );
};

exports.down = function (knex) {
  return knex.schema
    .table('review_templates', function (table) {
      table.dropColumn('business_id');
    })
    .table('archived_templates', function (table) {
      table.dropColumn('business_id');
    })
    .dropTableIfExists('businesses');
};
