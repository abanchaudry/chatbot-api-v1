-- Synchronize all local D1 data to remote Cloudflare D1

INSERT OR REPLACE INTO system_settings ("id", "company_name", "assistant_name", "domain_hint", "brand_tone", "primary_language", "updated_at", "fallback_schedule", "dataset_admin_enabled", "dataset_admin_weight", "dataset_pdf_enabled", "dataset_pdf_weight", "dataset_web_enabled", "dataset_web_weight") VALUES ('default', 'Enterprise Assistant', 'C', 'Official customer support and knowledge base assistant.', 'professional, calm, and customer-friendly', 'english', '2026-08-19 13:54:29', 'weekly', 1, 1.25, 1, 1.1, 1, 1.0);
INSERT OR REPLACE INTO files ("id", "file_name", "file_size", "file_status", "file_id", "file_path", "is_deleted", "deleted_date", "created_at", "updated_at", "checksum", "source", "version", "upload_id", "chunk_method", "embedding_model", "chunk_count", "error_message", "dataset") VALUES (65, 'Apex_2026_Corporate_Governance_and_Operations_Manual.pdf', 29650, 'completed', 'b1df2d52-9464-47d9-90d9-c6ec49e50c81', 'knowledge/original/b1df2d52-9464-47d9-90d9-c6ec49e50c81/Apex_2026_Corporate_Governance_and_Operations_Manual.pdf', 0, NULL, '2026-08-19 12:34:38', '2026-08-19 12:34:45', '1447e9906fe14f25a0d8feb73a2ac39a65039d907a267075a97b42268b495f49', 'admin', 'v1787142755667', 'TrNju7j5_5RD4iBkmK_9W', 'ai', 'text-embedding-3-small', '39.0', NULL, 'admin');
INSERT OR REPLACE INTO files ("id", "file_name", "file_size", "file_status", "file_id", "file_path", "is_deleted", "deleted_date", "created_at", "updated_at", "checksum", "source", "version", "upload_id", "chunk_method", "embedding_model", "chunk_count", "error_message", "dataset") VALUES (66, 'Apex_Executive_Customer_Operations_and_Nevada_NEM_Handbook_2026.pdf', 19342, 'completed', '363b1274-a935-4f13-a3d6-d8edce2434d4', 'knowledge/original/363b1274-a935-4f13-a3d6-d8edce2434d4/Apex_Executive_Customer_Operations_and_Nevada_NEM_Handbook_2026.pdf', 0, NULL, '2026-08-19 12:35:40', '2026-08-19 12:35:44', 'c2aa540c6a4aff5183d60ae96de69024cf818240af25d2476fe1d95fd5f80240', 'admin', 'v1787142901638', 'R25aAu5zQFmf741KA1kkt', 'ai', 'text-embedding-3-small', '26.0', NULL, 'admin');
INSERT OR REPLACE INTO files ("id", "file_name", "file_size", "file_status", "file_id", "file_path", "is_deleted", "deleted_date", "created_at", "updated_at", "checksum", "source", "version", "upload_id", "chunk_method", "embedding_model", "chunk_count", "error_message", "dataset") VALUES (67, 'Apex_PowerVault_15kWh_LFP_Storage_Service_Guide.pdf', 21278, 'completed', '381b263d-5ae1-4bbf-bc8d-956cbaf79d91', 'knowledge/original/381b263d-5ae1-4bbf-bc8d-956cbaf79d91/Apex_PowerVault_15kWh_LFP_Storage_Service_Guide.pdf', 0, NULL, '2026-08-19 12:40:48', '2026-08-19 12:40:55', 'cf7f11c05c235231cc35c184a26e3dece29684f9d833548d35f987629a6f2218', 'admin', 'v1787143217662', '27Fyn97qIubwkiHagzdps', 'ai', 'text-embedding-3-small', '27.0', NULL, 'pdf');
INSERT OR REPLACE INTO files ("id", "file_name", "file_size", "file_status", "file_id", "file_path", "is_deleted", "deleted_date", "created_at", "updated_at", "checksum", "source", "version", "upload_id", "chunk_method", "embedding_model", "chunk_count", "error_message", "dataset") VALUES (68, 'Apex_UltraVolt_X_Pro_450W_Complete_Engineering_Manual.pdf', 19957, 'completed', '2636d383-86d4-445f-8334-e8fc8319d5e6', 'knowledge/original/2636d383-86d4-445f-8334-e8fc8319d5e6/Apex_UltraVolt_X_Pro_450W_Complete_Engineering_Manual.pdf', 0, NULL, '2026-08-19 12:41:53', '2026-08-19 12:41:58', '35f929c3fd0784291ba7e1ca17b53178765cc0357a5f372483a8917a259918fc', 'admin', 'v1787143279288', 'eSqBrgNSxKkApvS2-mDm0', 'ai', 'text-embedding-3-small', '25.0', NULL, 'pdf');
INSERT OR REPLACE INTO files ("id", "file_name", "file_size", "file_status", "file_id", "file_path", "is_deleted", "deleted_date", "created_at", "updated_at", "checksum", "source", "version", "upload_id", "chunk_method", "embedding_model", "chunk_count", "error_message", "dataset") VALUES (69, 'Sponsorship - Solar Energy International (SEI): Solar Training for Clean Energy Careers', 2975, 'completed', 'web_CCFoP3bGdDMW', 'https://www.solarenergy.org/about/sponsorship', 0, NULL, '2026-08-19 13:12:12', '2026-08-19 13:12:17', NULL, 'web', NULL, NULL, NULL, NULL, '13.0', NULL, 'web');
INSERT OR REPLACE INTO files ("id", "file_name", "file_size", "file_status", "file_id", "file_path", "is_deleted", "deleted_date", "created_at", "updated_at", "checksum", "source", "version", "upload_id", "chunk_method", "embedding_model", "chunk_count", "error_message", "dataset") VALUES (70, 'Clean Energy Careers Grow Here', 20425, 'completed', 'web_o8u7CYfuMtZ5', 'https://www.solarenergy.org', 0, NULL, '2026-08-19 13:12:31', '2026-08-19 13:12:49', NULL, 'web', NULL, NULL, NULL, NULL, '64.0', NULL, 'web');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('9fee4bab0190c4894e848c1c032bebd824ae91bffb6d222593eb1468c39c24cc', 'admin', '```markdown
# APEX SOLAR SOLUTIONS — 2026 CORPORATE GOVERNANCE & OPERATIONS MANUAL

Official Executive Management Policy, Headquarters Registry, Cancellation Terms & NV NEM 3.0 Governance

## CHAPTER 1: CORPORATE CHARTER, LICENSURE & HEADQUARTERS DIRECTORY

**Official Corporate Headquarters (2026 Effective):** 9450 W Flamingo Rd, Suite 400, Las Vegas, NV 89147 (Clark County Jurisdiction).
**Customer Operations Hotline:** (702) 555-APEX (702-555-2739) — Direct phone support with dedicated Tier 2 engineering dispatch.
**Executive Escalation Desk:** (702) 555-0199 — Office of the Chief Operating Officer for complex warranty & contract inquiries.
**Customer Support Email:** support@apexsolarnevada.com (Monitored 24/7 with a guaranteed 2-hour business SLA).
**Legal & Regulatory Affairs:** legal-compliance@apexsolarnevada.com | Facsimile: (702) 555-0198.
**Official Operating Hours:** Monday through Friday: 8:00 AM to 6:00 PM PST; Saturday: 9:00 AM to 2:00 PM PST; Closed Sundays and Nevada State Holidays.
**24/7 Emergency Grid Disconnect Line:** 1-800-555-9898 — Continuous 24/7 hotline for emergency rapid shutdown and utility lockouts.
**Nevada State Contractors Board License:** #0084920 (Classification C-2 Electrical Contracting / Photovoltaic Systems, $2,500,000 Monetary Limit).
**Nevada Secretary of State Entity Number:** E0491282019-4 (Domestic Corporation in Good Standing since incorporation in 2019).
**Designated Qualifying Licensee:** Marcus Vance, Master Electrician #ME-09418.
**Territorial Coverage:** Unincorporated Clark County, City of Las Vegas, City of Henderson, City of North Las Vegas, Boulder City, and Mesquite utility corridors.

## CHAPTER 2: 2026 CANCELLATION, PERMITTING FEES & CONTRACT TERMINATION POLICY

The following policies represent the definitive, binding cancellation terms adopted by the Apex Executive Board on January 1, 2026. These terms strictly override all legacy 2024 guides, informal FAQ brochures, and third-party web portals:
**Phase 1 — Prior to Engineering Permit Submittal:** 100% full refund of all customer deposits within 3 business days via original payment method. Cancellation fee: $0.00.
**Phase 2 — Post-Permit Municipal Submittal:** Once engineering plans are submitted to Clark County Building Dept or City of Las Vegas/Henderson, a flat $150.00 administrative and structural drafting fee is deducted from the deposit. All remaining funds are remitted immediately.
**Phase 3 — Post-HOA Architectural Review Submittal:** No additional penalty above the $150 flat fee. HOA submission drafting costs are absorbed by Apex.
**Phase 4 — Physical Staging & On-Site Equipment Mobilization:** If equipment has been mobilized to the site, a $350 staging fee applies to cover crane and restocking logistics.
**Phase 5 — Post-Installation & Pre-PTO:** Contracts cannot be cancelled following physical racking and panel mounting. The customer retains the option to transfer the contract and 25-Year Platinum Warranty to a new homebuyer.
**Discrepancy Note:** Any mention on external web pages or legacy manuals quoting $250 RMA restocking charges or "30-day unconditional free cancellation after permit" is legacy and void.

*Apex Solar Solutions Inc. — Confidential & Proprietary Operational Manual*
*Page 1 of 5*

# APEX SOLAR SOLUTIONS — 2026 CORPORATE GOVERNANCE & OPERATIONS MANUAL

## CHAPTER 3: NEVADA NET ENERGY METERING (NEM 3.0 / TIER 4) & NV ENERGY INTERCONNECTION', 'v1787142755667', '2026-08-19 12:34:40', '["apex-solar-solutions-2026-corporate-governance-ope","chapter-1-corporate-charter-licensure-headquarters","chapter-2-2026-cancellation-permitting-fees-contra","chapter-3-nevada-net-energy-metering-nem-30-tier-4","150.00","APEX","SOLAR","MANUAL"]', 'Legal Regulatory', '📄 APEX SOLAR SOLUTIONS — 2026 CORPORATE GOVERNANCE & OPERATIONS MANUAL', ' 3.0', '[]', '```markdown
# APEX SOLAR SOLUTIONS — 2026 CORPORATE GOVERNANCE & OPERATIONS MANUAL

Official Executive Management Policy, Headquarters Registry, Cancellation Terms & NV NEM 3', 0, 'high', 'b1df2d52-9464-47d9-90d9-c6ec49e50c81', '131bc7bbeae2a0dbfebba32a5cd6448659385ada3c310ffcecd1974956939134', 'text-embedding-3-small', 'ai', 'small', NULL, 'admin');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('af5aff4c938e2772a0ee960702680a789fcf6ffdf35214202030e1342561efd9', 'admin', '```markdown
# APEX SOLAR SOLUTIONS — 2026 CORPORATE GOVERNANCE & OPERATIONS MANUAL

Official Executive Management Policy, Headquarters Registry, Cancellation Terms & NV NEM 3.0 Governance

## CHAPTER 1: CORPORATE CHARTER, LICENSURE & HEADQUARTERS DIRECTORY', 'v1787142755667', '2026-08-19 12:34:40', '["apex-solar-solutions-2026-corporate-governance-ope","chapter-1-corporate-charter-licensure-headquarters","APEX","SOLAR","MANUAL","NV","NEM","official-executive-management-policy"]', 'Legal Regulatory', '📝 APEX SOLAR SOLUTIONS — 2026 CORPORATE GOVERNANCE & OPERATIONS MANUAL', ' 3.0', '[]', '```markdown
# APEX SOLAR SOLUTIONS — 2026 CORPORATE GOVERNANCE & OPERATIONS MANUAL

Official Executive Management Policy, Headquarters Registry, Cancellation Terms & NV NEM 3', 1, 'high', 'b1df2d52-9464-47d9-90d9-c6ec49e50c81', 'b60ea4a0501307b61a77402041f764f49504583e4f1fc7a3356cf1f3dace36ee', 'text-embedding-3-small', 'ai', 'small', NULL, 'admin');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('12629ee199dfb570c5845b31b2457950bf6dcaae77ffe229cdc49e475e07a711', 'admin', '```markdown
# APEX SOLAR SOLUTIONS — 2026 CORPORATE GOVERNANCE & OPERATIONS MANUAL

Official Executive Management Policy, Headquarters Registry, Cancellation Terms & NV NEM 3.0 Governance

## CHAPTER 1: CORPORATE CHARTER, LICENSURE & HEADQUARTERS DIRECTORY', 'v1787142755667', '2026-08-19 12:34:40', '["corporate-headquarters-and-contact-information","apex-solar-solutions-2026-corporate-governance-ope","chapter-1-corporate-charter-licensure-headquarters","APEX","SOLAR","MANUAL","NV","NEM"]', 'Legal Regulatory', '🔍 Corporate Headquarters and Contact Information', ' 3.0', '[]', '```markdown
# APEX SOLAR SOLUTIONS — 2026 CORPORATE GOVERNANCE & OPERATIONS MANUAL

Official Executive Management Policy, Headquarters Registry, Cancellation Terms & NV NEM 3', 2, 'high', 'b1df2d52-9464-47d9-90d9-c6ec49e50c81', 'b60ea4a0501307b61a77402041f764f49504583e4f1fc7a3356cf1f3dace36ee', 'text-embedding-3-small', 'ai', 'small', NULL, 'admin');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('3971eba171d4a6a2c56f3f1d53e8a07d890748fb495a66aae773ffec04cab9f1', 'admin', '**Official Corporate Headquarters (2026 Effective):** 9450 W Flamingo Rd, Suite 400, Las Vegas, NV 89147 (Clark County Jurisdiction).
**Customer Operations Hotline:** (702) 555-APEX (702-555-2739) — Direct phone support with dedicated Tier 2 engineering dispatch.
**Executive Escalation Desk:** (702) 555-0199 — Office of the Chief Operating Officer for complex warranty & contract inquiries.
**Customer Support Email:** support@apexsolarnevada.com (Monitored 24/7 with a guaranteed 2-hour business SLA).
**Legal & Regulatory Affairs:** legal-compliance@apexsolarnevada.com | Facsimile: (702) 555-0198.
**Official Operating Hours:** Monday through Friday: 8:00 AM to 6:00 PM PST; Saturday: 9:00 AM to 2:00 PM PST; Closed Sundays and Nevada State Holidays.
**24/7 Emergency Grid Disconnect Line:** 1-800-555-9898 — Continuous 24/7 hotline for emergency rapid shutdown and utility lockouts.
**Nevada State Contractors Board License:** #0084920 (Classification C-2 Electrical Contracting / Photovoltaic Systems, $2,500,000 Monetary Limit).
**Nevada Secretary of State Entity Number:** E0491282019-4 (Domestic Corporation in Good Standing since incorporation in 2019).
**Designated Qualifying Licensee:** Marcus Vance, Master Electrician #ME-09418.
**Territorial Coverage:** Unincorporated Clark County, City of Las Vegas, City of Henderson, City of North Las Vegas, Boulder City, and Mesquite utility corridors.', 'v1787142755667', '2026-08-19 12:34:40', '["NV","APEX","SLA","AM","PM","PST","ME","contact-info"]', 'Legal Regulatory', '📝 Medium Chunk', NULL, '[]', '**Official Corporate Headquarters (2026 Effective):** 9450 W Flamingo Rd, Suite 400, Las Vegas, NV 89147 (Clark County Jurisdiction)', 3, 'high', 'b1df2d52-9464-47d9-90d9-c6ec49e50c81', '91b08cfb9dcaed538bd99cbe91731fbbb0336b7d21bdcd6dd58c579e4d27abe5', 'text-embedding-3-small', 'ai', 'small', NULL, 'admin');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('c43d4a4b1db368101d0814c58aff6a267274675d4a5116c9adda3c98c66a73ab', 'admin', '**Official Corporate Headquarters (2026 Effective):** 9450 W Flamingo Rd, Suite 400, Las Vegas, NV 89147 (Clark County Jurisdiction).
**Customer Operations Hotline:** (702) 555-APEX (702-555-2739) — Direct phone support with dedicated Tier 2 engineering dispatch.
**Executive Escalation Desk:** (702) 555-0199 — Office of the Chief Operating Officer for complex warranty & contract inquiries.
**Customer Support Email:** support@apexsolarnevada.com (Monitored 24/7 with a guaranteed 2-hour business SLA).
**Legal & Regulatory Affairs:** legal-compliance@apexsolarnevada.com | Facsimile: (702) 555-0198.
**Official Operating Hours:** Monday through Friday: 8:00 AM to 6:00 PM PST; Saturday: 9:00 AM to 2:00 PM PST; Closed Sundays and Nevada State Holidays.
**24/7 Emergency Grid Disconnect Line:** 1-800-555-9898 — Continuous 24/7 hotline for emergency rapid shutdown and utility lockouts.
**Nevada State Contractors Board License:** #0084920 (Classification C-2 Electrical Contracting / Photovoltaic Systems, $2,500,000 Monetary Limit).
**Nevada Secretary of State Entity Number:** E0491282019-4 (Domestic Corporation in Good Standing since incorporation in 2019).
**Designated Qualifying Licensee:** Marcus Vance, Master Electrician #ME-09418.
**Territorial Coverage:** Unincorporated Clark County, City of Las Vegas, City of Henderson, City of North Las Vegas, Boulder City, and Mesquite utility corridors.', 'v1787142755667', '2026-08-19 12:34:40', '["customer-support-and-emergency-services","NV","APEX","SLA","AM","PM","PST","ME"]', 'Legal Regulatory', '🔍 Customer Support and Emergency Services', NULL, '[]', '**Official Corporate Headquarters (2026 Effective):** 9450 W Flamingo Rd, Suite 400, Las Vegas, NV 89147 (Clark County Jurisdiction)', 4, 'high', 'b1df2d52-9464-47d9-90d9-c6ec49e50c81', '91b08cfb9dcaed538bd99cbe91731fbbb0336b7d21bdcd6dd58c579e4d27abe5', 'text-embedding-3-small', 'ai', 'small', NULL, 'admin');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('e4f593503b7a1b8f9073da5dd172b15124a1c533d0b9f989065bee586fc693fb', 'admin', '## CHAPTER 2: 2026 CANCELLATION, PERMITTING FEES & CONTRACT TERMINATION POLICY', 'v1787142755667', '2026-08-19 12:34:40', '["chapter-2-2026-cancellation-permitting-fees-contra","FEES","POLICY","legal-regulatory"]', 'Legal Regulatory', '📝 CHAPTER 2: 2026 CANCELLATION, PERMITTING FEES & CONTRACT TERMINATION POLICY', NULL, '[]', '## CHAPTER 2: 2026 CANCELLATION, PERMITTING FEES & CONTRACT TERMINATION POLICY', 5, 'high', 'b1df2d52-9464-47d9-90d9-c6ec49e50c81', '8b825831c21f297a55360de02b97fe6a394ef96a46e14f6b7c761665a5a63078', 'text-embedding-3-small', 'ai', 'small', NULL, 'admin');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('12ef6ece2794ee20708b600991149a6d3de945159835b9938affdca440d7655d', 'admin', '## CHAPTER 2: 2026 CANCELLATION, PERMITTING FEES & CONTRACT TERMINATION POLICY', 'v1787142755667', '2026-08-19 12:34:40', '["licensing-and-regulatory-compliance","FEES","POLICY","licensing","legal-regulatory"]', 'Legal Regulatory', '🔍 Licensing and Regulatory Compliance', NULL, '[]', '## CHAPTER 2: 2026 CANCELLATION, PERMITTING FEES & CONTRACT TERMINATION POLICY', 6, 'high', 'b1df2d52-9464-47d9-90d9-c6ec49e50c81', '8b825831c21f297a55360de02b97fe6a394ef96a46e14f6b7c761665a5a63078', 'text-embedding-3-small', 'ai', 'small', NULL, 'admin');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('94817cc192fc2e62b2efef59a68683fb32a9330f980d71dac7799adbc5067dc8', 'admin', 'The following policies represent the definitive, binding cancellation terms adopted by the Apex Executive Board on January 1, 2026. These terms strictly override all legacy 2024 guides, informal FAQ brochures, and third-party web portals:
**Phase 1 — Prior to Engineering Permit Submittal:** 100% full refund of all customer deposits within 3 business days via original payment method. Cancellation fee: $0.00.
**Phase 2 — Post-Permit Municipal Submittal:** Once engineering plans are submitted to Clark County Building Dept or City of Las Vegas/Henderson, a flat $150.00 administrative and structural drafting fee is deducted from the deposit. All remaining funds are remitted immediately.
**Phase 3 — Post-HOA Architectural Review Submittal:** No additional penalty above the $150 flat fee. HOA submission drafting costs are absorbed by Apex.
**Phase 4 — Physical Staging & On-Site Equipment Mobilization:** If equipment has been mobilized to the site, a $350 staging fee applies to cover crane and restocking logistics.
**Phase 5 — Post-Installation & Pre-PTO:** Contracts cannot be cancelled following physical racking and panel mounting. The customer retains the option to transfer the contract and 25-Year Platinum Warranty to a new homebuyer.
**Discrepancy Note:** Any mention on external web pages or legacy manuals quoting $250 RMA restocking charges or "30-day unconditional free cancellation after permit" is legacy and void.', 'v1787142755667', '2026-08-19 12:34:40', '["150.00","FAQ","HOA","PTO","RMA","penalty","licensing","appeals-process"]', 'Legal Regulatory', '📝 Medium Chunk', '0.00', '[]', 'The following policies represent the definitive, binding cancellation terms adopted by the Apex Executive Board on January 1, 2026', 7, 'high', 'b1df2d52-9464-47d9-90d9-c6ec49e50c81', '95f76786905ac0a7008ef456ba31abef0098828517a73b0d81dc266d939205ef', 'text-embedding-3-small', 'ai', 'small', NULL, 'admin');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('91e4a6ef2a0e89bb7572a779fd7e0784d5ad554c328f48b983313b52c6c8895f', 'admin', 'The following policies represent the definitive, binding cancellation terms adopted by the Apex Executive Board on January 1, 2026.

These terms strictly override all legacy 2024 guides, informal FAQ brochures, and third-party web portals:
**Phase 1 — Prior to Engineering Permit Submittal:** 100% full refund of all customer deposits within 3 business days via original payment method.', 'v1787142755667', '2026-08-19 12:34:40', '["cancellation-and-termination-policies","FAQ","licensing","apex-executive-board","engineering-permit-submittal","legal-regulatory","how-to","tutorial"]', 'Legal Regulatory', '🔍 Cancellation and Termination Policies', NULL, '[]', 'The following policies represent the definitive, binding cancellation terms adopted by the Apex Executive Board on January 1, 2026', 8, 'high', 'b1df2d52-9464-47d9-90d9-c6ec49e50c81', '742846271a886db5817b3e9236e7f836ad73a53ebb133f6c650a2a99197bdff7', 'text-embedding-3-small', 'ai', 'small', NULL, 'admin');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('d93fca8fbc0debd705eb50387231a149c3975f6372199509238d1b102a27788e', 'admin', 'Cancellation fee: $0.00.
**Phase 2 — Post-Permit Municipal Submittal:** Once engineering plans are submitted to Clark County Building Dept or City of Las Vegas/Henderson, a flat $150.00 administrative and structural drafting fee is deducted from the deposit.

All remaining funds are remitted immediately.
**Phase 3 — Post-HOA Architectural Review Submittal:** No additional penalty above the $150 flat fee.', 'v1787142755667', '2026-08-19 12:34:40', '["cancellation-and-termination-policies","150.00","HOA","penalty","licensing","appeals-process","permit-municipal-submittal","clark-county-building-dept"]', 'Legal Regulatory', '🔍 Cancellation and Termination Policies', '0.00', '[]', 'Cancellation fee: $0', 9, 'high', 'b1df2d52-9464-47d9-90d9-c6ec49e50c81', '15e02c4ee3ea37a97a553d0a198aec5ebf751114cbe68548f675e4b753003057', 'text-embedding-3-small', 'ai', 'small', NULL, 'admin');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('60efbfd072b8029e552a88a69a1e3822f2bc914bb1d1df247f7ea45f440f676d', 'admin', 'HOA submission drafting costs are absorbed by Apex.
**Phase 4 — Physical Staging & On-Site Equipment Mobilization:** If equipment has been mobilized to the site, a $350 staging fee applies to cover crane and restocking logistics.
**Phase 5 — Post-Installation & Pre-PTO:** Contracts cannot be cancelled following physical racking and panel mounting.', 'v1787142755667', '2026-08-19 12:34:40', '["cancellation-and-termination-policies","HOA","PTO","physical-staging","site-equipment-mobilization","legal-regulatory","timeline","deadline"]', 'Legal Regulatory', '🔍 Cancellation and Termination Policies', NULL, '[]', 'HOA submission drafting costs are absorbed by Apex', 10, 'high', 'b1df2d52-9464-47d9-90d9-c6ec49e50c81', '77c49c36527bfd774b4d53c578543d8d9a44613fca107bd82604da3c08b1f1ee', 'text-embedding-3-small', 'ai', 'small', NULL, 'admin');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('a8b8940957f96ebef27aee61e2e55e84941e5c42331271ee7d73c804566dd863', 'admin', 'The customer retains the option to transfer the contract and 25-Year Platinum Warranty to a new homebuyer.
**Discrepancy Note:** Any mention on external web pages or legacy manuals quoting $250 RMA restocking charges or "30-day unconditional free cancellation after permit" is legacy and void.', 'v1787142755667', '2026-08-19 12:34:40', '["cancellation-and-termination-policies","RMA","licensing","important-note","year-platinum-warranty","discrepancy-note","legal-regulatory","timeline"]', 'Legal Regulatory', '🔍 Cancellation and Termination Policies', NULL, '[]', 'The customer retains the option to transfer the contract and 25-Year Platinum Warranty to a new homebuyer', 11, 'high', 'b1df2d52-9464-47d9-90d9-c6ec49e50c81', '626b3fa1354e4dc233cfbe834addf788de34dad3797a979d6fcc6a1ddd52024a', 'text-embedding-3-small', 'ai', 'small', NULL, 'admin');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('9d69eb4fe62f481f17dead60032d09b5e8ca774fc543171259c962d7a889650a', 'admin', '*Apex Solar Solutions Inc. — Confidential & Proprietary Operational Manual*
*Page 1 of 5*

# APEX SOLAR SOLUTIONS — 2026 CORPORATE GOVERNANCE & OPERATIONS MANUAL

## CHAPTER 3: NEVADA NET ENERGY METERING (NEM 3.0 / TIER 4) & NV ENERGY INTERCONNECTION', 'v1787142755667', '2026-08-19 12:34:41', '["apex-solar-solutions-2026-corporate-governance-ope","chapter-3-nevada-net-energy-metering-nem-30-tier-4","APEX","SOLAR","MANUAL","NEVADA","NET","ENERGY"]', 'Legal Regulatory', '📝 APEX SOLAR SOLUTIONS — 2026 CORPORATE GOVERNANCE & OPERATIONS MANUAL', ' 3.0', '[]', '*Apex Solar Solutions Inc', 12, 'high', 'b1df2d52-9464-47d9-90d9-c6ec49e50c81', 'd22a64631f729804c3bd8c083f86e193548fd82da6958ffaa990e884bcefc244', 'text-embedding-3-small', 'ai', 'small', NULL, 'admin');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('13623c7922b0c5893d695af0ea53a002467249a6953e66308cac2d8ee24aa9e4', 'admin', '*Apex Solar Solutions Inc. — Confidential & Proprietary Operational Manual*
*Page 1 of 5*

# APEX SOLAR SOLUTIONS — 2026 CORPORATE GOVERNANCE & OPERATIONS MANUAL

## CHAPTER 3: NEVADA NET ENERGY METERING (NEM 3.0 / TIER 4) & NV ENERGY INTERCONNECTION', 'v1787142755667', '2026-08-19 12:34:41', '["operational-hours-and-coverage-areas","apex-solar-solutions-2026-corporate-governance-ope","chapter-3-nevada-net-energy-metering-nem-30-tier-4","APEX","SOLAR","MANUAL","NEVADA","NET"]', 'Legal Regulatory', '🔍 Operational Hours and Coverage Areas', ' 3.0', '[]', '*Apex Solar Solutions Inc', 13, 'high', 'b1df2d52-9464-47d9-90d9-c6ec49e50c81', 'd22a64631f729804c3bd8c083f86e193548fd82da6958ffaa990e884bcefc244', 'text-embedding-3-small', 'ai', 'small', NULL, 'admin');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('b6a28f041dd216cce005212981fb053510d5e09281f4b9affd514120f380ba06', 'admin', '**Regulatory Authority:** Public Utilities Commission of Nevada (PUCN) Docket No. 17-07026 and NRS 704.773.
**Net Metering Credit Rate (Tier 4):** 75% of the retail kilowatt-hour (kWh) electricity rate credited to customer utility ledger for all excess generation delivered to the grid.
**Interconnection Turnaround Standard:** Average timeline is 15 to 20 business days from Permission to Operate (PTO) package submission to bidirectional meter swap by NV Energy technicians.
**Smart Meter Upgrade Protocol:** Apex submits the Net Metering Interconnection Agreement (NMIA) within 24 hours of passing the local municipal final electrical inspection. NV Energy installs the Itron Centron OpenWay smart meter at no customer cost.
**True-Up Period & Monthly Minimum Charge:** Annual true-up occurs every December billing cycle. NV Energy maintains a fixed basic service charge of $12.50 per month which cannot be offset by solar energy credits.
**Solar Access Protection Law:** NRS 278.0208 guarantees that no governing body or HOA covenant may prohibit solar installation or increase system costs by more than $400 without specific structural cause.

## CHAPTER 4: FINANCIAL PRODUCTS, TAX CREDITS & PAYMENT STRUCTURES

**GoodLeap Clean Energy Loan Program:** Primary loan partner offering 15-Year fixed terms at 4.99% APR or 25-Year terms at 5.99% APR with $0 down and no prepayment penalties.
**Sunlight Financial Low-Payment Plan:** Secondary loan partner offering 20-Year and 25-Year balloon structures designed around the 30% Federal ITC payout in Month 18.
**Cash / ACH Incentive Bonus:** 5% discount off gross contract price for homeowners opting for milestone payments (20% at design, 40% at delivery, 30% at install, 10% at PTO).
**Federal Residential Clean Energy Credit (IRC Section 25D):** 30% tax credit on total gross expenditure (including solar panels, battery storage, main panel upgrades, and roof reinforcement).
**Nevada State Property Tax Exemption:** Under NRS 361.079, residential solar energy systems are 100% exempt from property tax reassessment.

## CHAPTER 5: HOA ARB LEGAL SUBMITTAL & NEVADA DISPUTE GOVERNANCE

Apex maintains a dedicated in-house HOA Architectural Review Board (ARB) legal processing team to ensure 100% compliance across Las Vegas communities:
**Submittal Turnaround:** Complete ARB package (site plan, 3D aerial layout, inverter spec sheets, color match trim samples) submitted within 48 hours of contract execution.
**Communities Supported:** Summerlin North/South/West HOAs, Green Valley Ranch, Mountain''s Edge, Southern Highlands, Providence, Skye Canyon, Sun City Anthem, Rhodes Ranch, and Aliante.
**Dispute Arbitration:** If an HOA requests panel relocation that diminishes annual output by more than 10%, Apex Legal files an expedited petition under NRS 278.0208 at zero expense to the homeowner.

## CHAPTER 6: CUSTOMER REFERRAL BONUSES & PROMOTIONAL REWARDS

**Standard Homeowner Referral Bonus:** $500.00 Visa Prepaid Reward Card issued for every referred neighbor or colleague who completes an installation.
**Multi-Referral Tier (3+ Installs):** Upgraded bonus of $750.00 per installation starting on the 4th completed referral within a single calendar year.

*Apex Solar Solutions Inc. — Confidential & Proprietary Operational Manual*
*Page 2 of 5*
```

---

```markdown
APEX SOLAR SOLUTIONS — 2026 CORPORATE GOVERNANCE & OPERATIONS MANUAL', 'v1787142755667', '2026-08-19 12:34:41', '["chapter-4-financial-products-tax-credits-payment-s","chapter-5-hoa-arb-legal-submittal-nevada-dispute-g","chapter-6-customer-referral-bonuses-promotional-re","NRS 704.773.","NRS 278.0208","NRS 361.079","704.773","12.50"]', 'Legal Regulatory', '📄 CHAPTER 4: FINANCIAL PRODUCTS, TAX CREDITS & PAYMENT STRUCTURES', 'NRS 704.773', '[]', '**Regulatory Authority:** Public Utilities Commission of Nevada (PUCN) Docket No', 14, 'high', 'b1df2d52-9464-47d9-90d9-c6ec49e50c81', 'e8187e9dd9ab60788750562135c8f99c5cf747c930f957f0b9ab7fe05f5597b4', 'text-embedding-3-small', 'ai', 'small', NULL, 'admin');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('0a5f0c3a9cc39c4aefce3c334ab5d963e7ce3163c20cc0f77bf5aac6d7caff3d', 'admin', '**Regulatory Authority:** Public Utilities Commission of Nevada (PUCN) Docket No. 17-07026 and NRS 704.773.
**Net Metering Credit Rate (Tier 4):** 75% of the retail kilowatt-hour (kWh) electricity rate credited to customer utility ledger for all excess generation delivered to the grid.
**Interconnection Turnaround Standard:** Average timeline is 15 to 20 business days from Permission to Operate (PTO) package submission to bidirectional meter swap by NV Energy technicians.
**Smart Meter Upgrade Protocol:** Apex submits the Net Metering Interconnection Agreement (NMIA) within 24 hours of passing the local municipal final electrical inspection. NV Energy installs the Itron Centron OpenWay smart meter at no customer cost.
**True-Up Period & Monthly Minimum Charge:** Annual true-up occurs every December billing cycle. NV Energy maintains a fixed basic service charge of $12.50 per month which cannot be offset by solar energy credits.
**Solar Access Protection Law:** NRS 278.0208 guarantees that no governing body or HOA covenant may prohibit solar installation or increase system costs by more than $400 without specific structural cause.

## CHAPTER 4: FINANCIAL PRODUCTS, TAX CREDITS & PAYMENT STRUCTURES', 'v1787142755667', '2026-08-19 12:34:41', '["chapter-4-financial-products-tax-credits-payment-s","NRS 704.773.","NRS 278.0208","704.773","12.50","278.0208","PUCN","NRS"]', 'Legal Regulatory', '📝 CHAPTER 4: FINANCIAL PRODUCTS, TAX CREDITS & PAYMENT STRUCTURES', 'NRS 704.773', '[]', '**Regulatory Authority:** Public Utilities Commission of Nevada (PUCN) Docket No', 15, 'high', 'b1df2d52-9464-47d9-90d9-c6ec49e50c81', '68c6aab678633aabefb9da1251226007156fceb6334bb498199e12ea153ab7c7', 'text-embedding-3-small', 'ai', 'small', NULL, 'admin');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('8fae0788f2d5c8a4effed8b2e8054c3c5f74a0df0a0b0ae1ac4439f720ce76a0', 'admin', '**Regulatory Authority:** Public Utilities Commission of Nevada (PUCN) Docket No. 17-07026 and NRS 704.773.
**Net Metering Credit Rate (Tier 4):** 75% of the retail kilowatt-hour (kWh) electricity rate credited to customer utility ledger for all excess generation delivered to the grid.
**Interconnection Turnaround Standard:** Average timeline is 15 to 20 business days from Permission to Operate (PTO) package submission to bidirectional meter swap by NV Energy technicians.
**Smart Meter Upgrade Protocol:** Apex submits the Net Metering Interconnection Agreement (NMIA) within 24 hours of passing the local municipal final electrical inspection.', 'v1787142755667', '2026-08-19 12:34:41', '["regulatory-authority-overview","NRS 704.773.","704.773","PUCN","NRS","PTO","NV","NMIA"]', 'Legal Regulatory', '🔍 Regulatory Authority Overview', 'NRS 704.773', '[]', '**Regulatory Authority:** Public Utilities Commission of Nevada (PUCN) Docket No', 16, 'high', 'b1df2d52-9464-47d9-90d9-c6ec49e50c81', '0f84356f26abfd04cd84b93e287021371f77ac67feb6575b747bfa84da81df70', 'text-embedding-3-small', 'ai', 'small', NULL, 'admin');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('4165d34275abcdfc2b2980b6c0fe99c70a14ea5ebbf997692544d488eccace08', 'admin', 'NV Energy installs the Itron Centron OpenWay smart meter at no customer cost.
**True-Up Period & Monthly Minimum Charge:** Annual true-up occurs every December billing cycle.', 'v1787142755667', '2026-08-19 12:34:41', '["regulatory-authority-overview","NV","itron-centron","monthly-minimum-charge","legal-regulatory","energy","itron centron","true"]', 'Legal Regulatory', '🔍 Regulatory Authority Overview', NULL, '[]', 'NV Energy installs the Itron Centron OpenWay smart meter at no customer cost', 17, 'high', 'b1df2d52-9464-47d9-90d9-c6ec49e50c81', 'b666a9b96ed01fcafee1c349a73606766c48277b533979a7d54b77ec2219459e', 'text-embedding-3-small', 'ai', 'small', NULL, 'admin');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('0be5f234e97d37620181729d78f10f4634b7ea9c1cee406f1079f44d3bd88fc3', 'admin', 'NV Energy maintains a fixed basic service charge of $12.50 per month which cannot be offset by solar energy credits.
**Solar Access Protection Law:** NRS 278.0208 guarantees that no governing body or HOA covenant may prohibit solar installation or increase system costs by more than $400 without specific structural cause.

## CHAPTER 4: FINANCIAL PRODUCTS, TAX CREDITS & PAYMENT STRUCTURES', 'v1787142755667', '2026-08-19 12:34:41', '["regulatory-authority-overview","chapter-4-financial-products-tax-credits-payment-s","NRS 278.0208","12.50","278.0208","NV","NRS","HOA"]', 'Legal Regulatory', '🔍 Regulatory Authority Overview', '12.50', '[]', 'NV Energy maintains a fixed basic service charge of $12', 18, 'high', 'b1df2d52-9464-47d9-90d9-c6ec49e50c81', 'ad1b221cb31739f5859e9f763aa05e756c0ef9be16397d235ebf9b707325e889', 'text-embedding-3-small', 'ai', 'small', NULL, 'admin');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('ddc18e6383bf59c945ca230e0315499020fddd8c50128d3e6300434bdbc292bf', 'admin', '**GoodLeap Clean Energy Loan Program:** Primary loan partner offering 15-Year fixed terms at 4.99% APR or 25-Year terms at 5.99% APR with $0 down and no prepayment penalties.
**Sunlight Financial Low-Payment Plan:** Secondary loan partner offering 20-Year and 25-Year balloon structures designed around the 30% Federal ITC payout in Month 18.
**Cash / ACH Incentive Bonus:** 5% discount off gross contract price for homeowners opting for milestone payments (20% at design, 40% at delivery, 30% at install, 10% at PTO).
**Federal Residential Clean Energy Credit (IRC Section 25D):** 30% tax credit on total gross expenditure (including solar panels, battery storage, main panel upgrades, and roof reinforcement).
**Nevada State Property Tax Exemption:** Under NRS 361.079, residential solar energy systems are 100% exempt from property tax reassessment.

## CHAPTER 5: HOA ARB LEGAL SUBMITTAL & NEVADA DISPUTE GOVERNANCE', 'v1787142755667', '2026-08-19 12:34:41', '["chapter-5-hoa-arb-legal-submittal-nevada-dispute-g","NRS 361.079","361.079","APR","ITC","ACH","PTO","IRC"]', 'Legal Regulatory', '📝 CHAPTER 5: HOA ARB LEGAL SUBMITTAL & NEVADA DISPUTE GOVERNANCE', ' 4.99', '[]', '**GoodLeap Clean Energy Loan Program:** Primary loan partner offering 15-Year fixed terms at 4', 19, 'high', 'b1df2d52-9464-47d9-90d9-c6ec49e50c81', 'be6eca7046f4de4576162844a706563bcb25bae613e211155c3264248ac1ca24', 'text-embedding-3-small', 'ai', 'small', NULL, 'admin');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('b3232e30c6c8252c51b421c7eae07de04705619be2b57d638f4bb8c2556635eb', 'admin', '**GoodLeap Clean Energy Loan Program:** Primary loan partner offering 15-Year fixed terms at 4.99% APR or 25-Year terms at 5.99% APR with $0 down and no prepayment penalties.
**Sunlight Financial Low-Payment Plan:** Secondary loan partner offering 20-Year and 25-Year balloon structures designed around the 30% Federal ITC payout in Month 18.
**Cash / ACH Incentive Bonus:** 5% discount off gross contract price for homeowners opting for milestone payments (20% at design, 40% at delivery, 30% at install, 10% at PTO).
**Federal Residential Clean Energy Credit (IRC Section 25D):** 30% tax credit on total gross expenditure (including solar panels, battery storage, main panel upgrades, and roof reinforcement).
**Nevada State Property Tax Exemption:** Under NRS 361.079, residential solar energy systems are 100% exempt from property tax reassessment.', 'v1787142755667', '2026-08-19 12:34:41', '["net-metering-and-interconnection-standards","NRS 361.079","361.079","APR","ITC","ACH","PTO","IRC"]', 'Legal Regulatory', '🔍 Net Metering and Interconnection Standards', ' 4.99', '[]', '**GoodLeap Clean Energy Loan Program:** Primary loan partner offering 15-Year fixed terms at 4', 20, 'high', 'b1df2d52-9464-47d9-90d9-c6ec49e50c81', 'c842ffe1933c052492a4b6a47ef53a8c84643e43a74cef7bd7c214afd39fe239', 'text-embedding-3-small', 'ai', 'small', NULL, 'admin');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('a79dcce2baeae8dda6184dde239c02fdabc3b15c3efe6f1431c023420d30f1f8', 'admin', '## CHAPTER 5: HOA ARB LEGAL SUBMITTAL & NEVADA DISPUTE GOVERNANCE', 'v1787142755667', '2026-08-19 12:34:41', '["net-metering-and-interconnection-standards","HOA","ARB","LEGAL","NEVADA","legal-regulatory","legal","compliance"]', 'Legal Regulatory', '🔍 Net Metering and Interconnection Standards', NULL, '[]', '## CHAPTER 5: HOA ARB LEGAL SUBMITTAL & NEVADA DISPUTE GOVERNANCE', 21, 'high', 'b1df2d52-9464-47d9-90d9-c6ec49e50c81', '0fbd056f5e3bab294a383ba8823b689d750f2e957aa549f13623e3fc49ff4c8b', 'text-embedding-3-small', 'ai', 'small', NULL, 'admin');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('6b016a747f50d8144d98ba1c56242c3fb2a21576326d68f182dfefd2a9dc17e3', 'admin', 'Apex maintains a dedicated in-house HOA Architectural Review Board (ARB) legal processing team to ensure 100% compliance across Las Vegas communities:
**Submittal Turnaround:** Complete ARB package (site plan, 3D aerial layout, inverter spec sheets, color match trim samples) submitted within 48 hours of contract execution.
**Communities Supported:** Summerlin North/South/West HOAs, Green Valley Ranch, Mountain''s Edge, Southern Highlands, Providence, Skye Canyon, Sun City Anthem, Rhodes Ranch, and Aliante.
**Dispute Arbitration:** If an HOA requests panel relocation that diminishes annual output by more than 10%, Apex Legal files an expedited petition under NRS 278.0208 at zero expense to the homeowner.

## CHAPTER 6: CUSTOMER REFERRAL BONUSES & PROMOTIONAL REWARDS

**Standard Homeowner Referral Bonus:** $500.00 Visa Prepaid Reward Card issued for every referred neighbor or colleague who completes an installation.
**Multi-Referral Tier (3+ Installs):** Upgraded bonus of $750.00 per installation starting on the 4th completed referral within a single calendar year.

*Apex Solar Solutions Inc. — Confidential & Proprietary Operational Manual*
*Page 2 of 5*
```

---

```markdown
APEX SOLAR SOLUTIONS — 2026 CORPORATE GOVERNANCE & OPERATIONS MANUAL', 'v1787142755667', '2026-08-19 12:34:41', '["chapter-6-customer-referral-bonuses-promotional-re","NRS 278.0208","278.0208","500.00","750.00","HOA","ARB","NRS"]', 'Legal Regulatory', '📝 CHAPTER 6: CUSTOMER REFERRAL BONUSES & PROMOTIONAL REWARDS', 'NRS 278.0208', '[]', 'Apex maintains a dedicated in-house HOA Architectural Review Board (ARB) legal processing team to ensure 100% compliance across Las Vegas communities:
**Submittal Turnaround:** Complete ARB package (s', 22, 'high', 'b1df2d52-9464-47d9-90d9-c6ec49e50c81', '351d7c9a2d2eb7165da3ee1c147eb1f7bc5ce1e573a8c768315e4f961feed823', 'text-embedding-3-small', 'ai', 'small', NULL, 'admin');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('1dd7f04d28c945d93f4d833158c2bf2251e37fb0b702fa02e2741ab8349f8e1e', 'admin', 'Apex maintains a dedicated in-house HOA Architectural Review Board (ARB) legal processing team to ensure 100% compliance across Las Vegas communities:
**Submittal Turnaround:** Complete ARB package (site plan, 3D aerial layout, inverter spec sheets, color match trim samples) submitted within 48 hours of contract execution.
**Communities Supported:** Summerlin North/South/West HOAs, Green Valley Ranch, Mountain''s Edge, Southern Highlands, Providence, Skye Canyon, Sun City Anthem, Rhodes Ranch, and Aliante.
**Dispute Arbitration:** If an HOA requests panel relocation that diminishes annual output by more than 10%, Apex Legal files an expedited petition under NRS 278.0208 at zero expense to the homeowner.', 'v1787142755667', '2026-08-19 12:34:41', '["financial-products-and-tax-credits","NRS 278.0208","278.0208","HOA","ARB","NRS","appeals-process","architectural-review-board"]', 'Legal Regulatory', '🔍 Financial Products and Tax Credits', 'NRS 278.0208', '[]', 'Apex maintains a dedicated in-house HOA Architectural Review Board (ARB) legal processing team to ensure 100% compliance across Las Vegas communities:
**Submittal Turnaround:** Complete ARB package (s', 23, 'high', 'b1df2d52-9464-47d9-90d9-c6ec49e50c81', '48ed5994904aa8ff17cb7ae4b344b65f4c1576411c730409309c4fe56857fb4f', 'text-embedding-3-small', 'ai', 'small', NULL, 'admin');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('9e2463a8c1fbf8add02a9dd79eec61b1dafd129945858330e0f7e52fa478616c', 'admin', '## CHAPTER 6: CUSTOMER REFERRAL BONUSES & PROMOTIONAL REWARDS

**Standard Homeowner Referral Bonus:** $500.00 Visa Prepaid Reward Card issued for every referred neighbor or colleague who completes an installation.
**Multi-Referral Tier (3+ Installs):** Upgraded bonus of $750.00 per installation starting on the 4th completed referral within a single calendar year.', 'v1787142755667', '2026-08-19 12:34:41', '["financial-products-and-tax-credits","500.00","750.00","standard-homeowner-referral-bonus","visa-prepaid-reward-card","legal-regulatory","timeline","deadline"]', 'Legal Regulatory', '🔍 Financial Products and Tax Credits', '500.00', '[]', '## CHAPTER 6: CUSTOMER REFERRAL BONUSES & PROMOTIONAL REWARDS

**Standard Homeowner Referral Bonus:** $500', 24, 'high', 'b1df2d52-9464-47d9-90d9-c6ec49e50c81', '0d620c92b1e7d7f0eeaf3c5fcc8d1705ce91fe7d33afef7eb0b0c48ce19b5540', 'text-embedding-3-small', 'ai', 'small', NULL, 'admin');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('d9bde745e233e051eb04a4fc2fcca62dd3d431fa20b4cfe541f2bb4197ab87d7', 'admin', '*Apex Solar Solutions Inc. — Confidential & Proprietary Operational Manual*
*Page 2 of 5*
```

---

```markdown
APEX SOLAR SOLUTIONS — 2026 CORPORATE GOVERNANCE & OPERATIONS MANUAL', 'v1787142755667', '2026-08-19 12:34:41', '["financial-products-and-tax-credits","APEX","SOLAR","MANUAL","apex-solar-solutions-inc","proprietary-operational-manual","legal-regulatory","apex solar solutions inc"]', 'Legal Regulatory', '🔍 Financial Products and Tax Credits', NULL, '[]', '*Apex Solar Solutions Inc', 25, 'high', 'b1df2d52-9464-47d9-90d9-c6ec49e50c81', 'd42e1976aa30cd10a2460948d64f0bb83c5f3262a6ab8eb02e0c290792792cde', 'text-embedding-3-small', 'ai', 'small', NULL, 'admin');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('c591f0fbd9373723056bd50cc8f01078dc5bf1643ce2c04e670d1a49d85e38a2', 'admin', 'Payment Schedule: Referral disbursements are processed via digital ACH or physical tracked Visa debit card on the 15th day of every calendar month following customer PTO.

Referral Eligibility Requirements: Open to all active Apex Solar homeowners in good standing; no cap on annual referral reward totals.

CHAPTER 7: 25-YEAR PLATINUM WARRANTY & ESCALATION PROTOCOL

25-Year Equipment Warranty: Full replacement coverage on all photovoltaic modules, microinverters, and power optimizers.

25-Year Workmanship Warranty: Covers all electrical wiring, conduit bending, breaker connections, sub-panel upgrades, and physical racking.

10-Year Roof Penetration Guarantee: Apex guarantees that every roof penetration sealed with flashing and silicone sealant will remain 100% watertight for 10 full years.

Zero-Deductible Policy: Zero diagnostic charges, zero labor fees, and zero shipping costs for any covered warranty replacement.

Warranty Transferability: Fully transferable to future property buyers upon submission of a standard 1-page Change of Ownership form within 60 days of real estate closing.

CHAPTER 8: CORPORATE COMPLIANCE & ETHICAL MARKETING CHARTER

No High-Pressure Sales Directive: All Apex energy consultants are W-2 employees bound by the Nevada Consumer Solar Protection Act (NRS 598.980-598.982).

Standard Right of Rescission: 3-day statutory cooling-off period under Nevada law allowing unconditional contract rescission without fee or obligation.

Transparent Production Guarantee: Apex guarantees at least 90% of modeled year-one kilowatt-hour generation or pays the homeowner the cash difference.

Safety Record & OSHA Certification: 100% OSHA-30 certified field supervisors with over 500,000 work-hours without lost-time incident.

CHAPTER 9: EMERGENCY MANAGEMENT & ENVIRONMENTAL DISASTER RESPONSE

Monsoon Storm Damage Protocol: 24-hour emergency response team dispatched for severe wind gusts exceeding 75 MPH in the Las Vegas valley.

Seismic & Structural Verification: Racking certified to withstand IBC Seismic Design Category D without displacement or grounding breach.

Utility Lockout Coordination: Direct hotline to NV Energy Emergency Operations Center for rapid grid-level meter disconnects.

Apex Solar Solutions Inc. — Confidential & Proprietary Operational Manual

Page 3 of 5
```

```markdown
APEX SOLAR SOLUTIONS — 2026 CORPORATE GOVERNANCE & OPERATIONS MANUAL

SUPPLEMENTAL APPENDIX — REGULATORY COMPLIANCE & VERIFICATION DATA

This appendix records archival state filings, calibration logs, and jurisdiction-specific regulatory code provisions.

Apex Solar Solutions Inc. — Confidential & Proprietary Operational Manual

Page 4 of 5
```

---

```markdown
APEX SOLAR SOLUTIONS — 2026 CORPORATE GOVERNANCE & OPERATIONS MANUAL

SUPPLEMENTAL APPENDIX — REGULATORY COMPLIANCE & VERIFICATION DATA

This appendix records archival state filings, calibration logs, and jurisdiction-specific regulatory code provisions.

Apex Solar Solutions Inc. — Confidential & Proprietary Operational Manual                        Page 5 of 5
```', 'v1787142755667', '2026-08-19 12:34:41', '["NRS 598.980","598.980","598.982","ACH","PTO","YEAR","NRS","OSHA"]', 'Legal Regulatory', '📄 Large Chunk', 'NRS 598.980-598.982', '[]', 'Payment Schedule: Referral disbursements are processed via digital ACH or physical tracked Visa debit card on the 15th day of every calendar month following customer PTO', 26, 'high', 'b1df2d52-9464-47d9-90d9-c6ec49e50c81', '4c0377ba55278347138c1517244f7c9141fc250c7d331169100ca7e316a96855', 'text-embedding-3-small', 'ai', 'small', NULL, 'admin');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('65bc66a070eea5fc09668f0917f67388d68ee8d47a39df84e63abf801b24dcfc', 'admin', 'Payment Schedule: Referral disbursements are processed via digital ACH or physical tracked Visa debit card on the 15th day of every calendar month following customer PTO.

Referral Eligibility Requirements: Open to all active Apex Solar homeowners in good standing; no cap on annual referral reward totals.

CHAPTER 7: 25-YEAR PLATINUM WARRANTY & ESCALATION PROTOCOL

25-Year Equipment Warranty: Full replacement coverage on all photovoltaic modules, microinverters, and power optimizers.

25-Year Workmanship Warranty: Covers all electrical wiring, conduit bending, breaker connections, sub-panel upgrades, and physical racking.

10-Year Roof Penetration Guarantee: Apex guarantees that every roof penetration sealed with flashing and silicone sealant will remain 100% watertight for 10 full years.

Zero-Deductible Policy: Zero diagnostic charges, zero labor fees, and zero shipping costs for any covered warranty replacement.

Warranty Transferability: Fully transferable to future property buyers upon submission of a standard 1-page Change of Ownership form within 60 days of real estate closing.

CHAPTER 8: CORPORATE COMPLIANCE & ETHICAL MARKETING CHARTER

No High-Pressure Sales Directive: All Apex energy consultants are W-2 employees bound by the Nevada Consumer Solar Protection Act (NRS 598.980-598.982).', 'v1787142755667', '2026-08-19 12:34:41', '["NRS 598.980","598.980","598.982","ACH","PTO","YEAR","NRS","deadline"]', 'Legal Regulatory', '📝 Medium Chunk', 'NRS 598.980-598.982', '[]', 'Payment Schedule: Referral disbursements are processed via digital ACH or physical tracked Visa debit card on the 15th day of every calendar month following customer PTO', 27, 'high', 'b1df2d52-9464-47d9-90d9-c6ec49e50c81', 'ced4021a1f63875c346c29ae0d5dd271d2659f4387e2e97c755d291d87ecfc9f', 'text-embedding-3-small', 'ai', 'small', NULL, 'admin');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('f2d968f0e54c2a728d18e99cfc0bc1f8d462a2a7af53ba1a14ad588757f77ab3', 'admin', 'Payment Schedule: Referral disbursements are processed via digital ACH or physical tracked Visa debit card on the 15th day of every calendar month following customer PTO.

Referral Eligibility Requirements: Open to all active Apex Solar homeowners in good standing; no cap on annual referral reward totals.

CHAPTER 7: 25-YEAR PLATINUM WARRANTY & ESCALATION PROTOCOL', 'v1787142755667', '2026-08-19 12:34:41', '["payment-schedule-and-referral-disbursements","ACH","PTO","YEAR","eligibility","payment-schedule","referral-eligibility-requirements","legal-regulatory"]', 'Legal Regulatory', '🔍 Payment Schedule and Referral Disbursements', NULL, '[]', 'Payment Schedule: Referral disbursements are processed via digital ACH or physical tracked Visa debit card on the 15th day of every calendar month following customer PTO', 28, 'high', 'b1df2d52-9464-47d9-90d9-c6ec49e50c81', '62f395d384b6a392cc3f3cc87b5ff90b41b637948625652e666b014fafb7bd62', 'text-embedding-3-small', 'ai', 'small', NULL, 'admin');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('8ff9e85695235cb2c33a621fd54723d40c20ed09a131bc54daf1e548c002e622', 'admin', '25-Year Equipment Warranty: Full replacement coverage on all photovoltaic modules, microinverters, and power optimizers.

25-Year Workmanship Warranty: Covers all electrical wiring, conduit bending, breaker connections, sub-panel upgrades, and physical racking.

10-Year Roof Penetration Guarantee: Apex guarantees that every roof penetration sealed with flashing and silicone sealant will remain 100% watertight for 10 full years.', 'v1787142755667', '2026-08-19 12:34:41', '["payment-schedule-and-referral-disbursements","year-equipment-warranty","year-workmanship-warranty","legal-regulatory","year equipment warranty","full","year workmanship warranty"]', 'Legal Regulatory', '🔍 Payment Schedule and Referral Disbursements', NULL, '[]', '25-Year Equipment Warranty: Full replacement coverage on all photovoltaic modules, microinverters, and power optimizers', 29, 'high', 'b1df2d52-9464-47d9-90d9-c6ec49e50c81', '4e5f34371f5bb526e191d13521218d74b25aa7863d6f4bdbc3440396cf81d169', 'text-embedding-3-small', 'ai', 'small', NULL, 'admin');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('23af9f957b742b89dba3bd9a34ee08ff70f42e55554a07b1c2bbc09e37863c1e', 'admin', 'Zero-Deductible Policy: Zero diagnostic charges, zero labor fees, and zero shipping costs for any covered warranty replacement.

Warranty Transferability: Fully transferable to future property buyers upon submission of a standard 1-page Change of Ownership form within 60 days of real estate closing.

CHAPTER 8: CORPORATE COMPLIANCE & ETHICAL MARKETING CHARTER', 'v1787142755667', '2026-08-19 12:34:41', '["payment-schedule-and-referral-disbursements","deadline","deductible-policy","warranty-transferability","legal-regulatory","timeline","legal","compliance"]', 'Legal Regulatory', '🔍 Payment Schedule and Referral Disbursements', NULL, '[]', 'Zero-Deductible Policy: Zero diagnostic charges, zero labor fees, and zero shipping costs for any covered warranty replacement', 30, 'high', 'b1df2d52-9464-47d9-90d9-c6ec49e50c81', '1008153965c51d1961ac08c2ab25a2e09efe09c0c5771a282bc1704f7298ca9d', 'text-embedding-3-small', 'ai', 'small', NULL, 'admin');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('759f9d51751ee7fbd6ab30f7217d7a97bf3b6dee83da2fbf72956b856e9c10df', 'admin', 'No High-Pressure Sales Directive: All Apex energy consultants are W-2 employees bound by the Nevada Consumer Solar Protection Act (NRS 598.980-598.982).', 'v1787142755667', '2026-08-19 12:34:41', '["payment-schedule-and-referral-disbursements","NRS 598.980","598.980","598.982","NRS","pressure-sales-directive","all-apex","legal-regulatory"]', 'Legal Regulatory', '🔍 Payment Schedule and Referral Disbursements', 'NRS 598.980-598.982', '[]', 'No High-Pressure Sales Directive: All Apex energy consultants are W-2 employees bound by the Nevada Consumer Solar Protection Act (NRS 598', 31, 'high', 'b1df2d52-9464-47d9-90d9-c6ec49e50c81', '8831d011add98d016a4c3cc8e9733051bdc5e00ffedb0763777dfe8193517ba3', 'text-embedding-3-small', 'ai', 'small', NULL, 'admin');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('82de85008ed0b4fd683002f5364a3d2f8049883296c7183c4c1517e835d98abc', 'admin', 'Standard Right of Rescission: 3-day statutory cooling-off period under Nevada law allowing unconditional contract rescission without fee or obligation.

Transparent Production Guarantee: Apex guarantees at least 90% of modeled year-one kilowatt-hour generation or pays the homeowner the cash difference.

Safety Record & OSHA Certification: 100% OSHA-30 certified field supervisors with over 500,000 work-hours without lost-time incident.

CHAPTER 9: EMERGENCY MANAGEMENT & ENVIRONMENTAL DISASTER RESPONSE

Monsoon Storm Damage Protocol: 24-hour emergency response team dispatched for severe wind gusts exceeding 75 MPH in the Las Vegas valley.

Seismic & Structural Verification: Racking certified to withstand IBC Seismic Design Category D without displacement or grounding breach.

Utility Lockout Coordination: Direct hotline to NV Energy Emergency Operations Center for rapid grid-level meter disconnects.

Apex Solar Solutions Inc. — Confidential & Proprietary Operational Manual

Page 3 of 5
```

```markdown
APEX SOLAR SOLUTIONS — 2026 CORPORATE GOVERNANCE & OPERATIONS MANUAL

SUPPLEMENTAL APPENDIX — REGULATORY COMPLIANCE & VERIFICATION DATA

This appendix records archival state filings, calibration logs, and jurisdiction-specific regulatory code provisions.

Apex Solar Solutions Inc. — Confidential & Proprietary Operational Manual

Page 4 of 5
```

---', 'v1787142755667', '2026-08-19 12:34:41', '["OSHA","MPH","IBC","NV","APEX","SOLAR","MANUAL","DATA"]', 'Legal Regulatory', '📝 Medium Chunk', NULL, '[]', 'Standard Right of Rescission: 3-day statutory cooling-off period under Nevada law allowing unconditional contract rescission without fee or obligation', 32, 'high', 'b1df2d52-9464-47d9-90d9-c6ec49e50c81', '7e56ac57cdb3cf844675b1a938520466e287f7a0d04312aca291893ef372cd4c', 'text-embedding-3-small', 'ai', 'small', NULL, 'admin');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('3f846921ef3756074a86c10fe70031348c8dc480373460ceae1b6c2d2552aa67', 'admin', 'Standard Right of Rescission: 3-day statutory cooling-off period under Nevada law allowing unconditional contract rescission without fee or obligation.

Transparent Production Guarantee: Apex guarantees at least 90% of modeled year-one kilowatt-hour generation or pays the homeowner the cash difference.

Safety Record & OSHA Certification: 100% OSHA-30 certified field supervisors with over 500,000 work-hours without lost-time incident.', 'v1787142755667', '2026-08-19 12:34:41', '["warranty-coverage-and-guarantees","OSHA","licensing","standard-right","transparent-production-guarantee","legal-regulatory","timeline","deadline"]', 'Legal Regulatory', '🔍 Warranty Coverage and Guarantees', NULL, '[]', 'Standard Right of Rescission: 3-day statutory cooling-off period under Nevada law allowing unconditional contract rescission without fee or obligation', 33, 'high', 'b1df2d52-9464-47d9-90d9-c6ec49e50c81', 'b81fd26430576366a05e8e4931558f7a284ddebaed77a0de0b02c489412c2203', 'text-embedding-3-small', 'ai', 'small', NULL, 'admin');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('c35dc2813a27b57d354570db0f52280e7c1eb096b57bb1332c06eb7962d11a91', 'admin', 'CHAPTER 9: EMERGENCY MANAGEMENT & ENVIRONMENTAL DISASTER RESPONSE

Monsoon Storm Damage Protocol: 24-hour emergency response team dispatched for severe wind gusts exceeding 75 MPH in the Las Vegas valley.

Seismic & Structural Verification: Racking certified to withstand IBC Seismic Design Category D without displacement or grounding breach.', 'v1787142755667', '2026-08-19 12:34:41', '["warranty-coverage-and-guarantees","MPH","IBC","monsoon-storm-damage-protocol","las-vegas","legal-regulatory","monsoon storm damage protocol","las vegas"]', 'Legal Regulatory', '🔍 Warranty Coverage and Guarantees', NULL, '[]', 'CHAPTER 9: EMERGENCY MANAGEMENT & ENVIRONMENTAL DISASTER RESPONSE

Monsoon Storm Damage Protocol: 24-hour emergency response team dispatched for severe wind gusts exceeding 75 MPH in the Las Vegas val', 34, 'high', 'b1df2d52-9464-47d9-90d9-c6ec49e50c81', 'a1132773f5c1ac31bd68981c97e87b910c2e6896dd56774e9d6a31d582241402', 'text-embedding-3-small', 'ai', 'small', NULL, 'admin');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('d590a923db2b548bcd9b44fcc394d117f5a74983567447573f9a2e5f6e07fa31', 'admin', 'Utility Lockout Coordination: Direct hotline to NV Energy Emergency Operations Center for rapid grid-level meter disconnects.

Apex Solar Solutions Inc. — Confidential & Proprietary Operational Manual

Page 3 of 5
```

```markdown
APEX SOLAR SOLUTIONS — 2026 CORPORATE GOVERNANCE & OPERATIONS MANUAL

SUPPLEMENTAL APPENDIX — REGULATORY COMPLIANCE & VERIFICATION DATA', 'v1787142755667', '2026-08-19 12:34:41', '["warranty-coverage-and-guarantees","NV","APEX","SOLAR","MANUAL","DATA","utility-lockout-coordination","energy-emergency-operations-center"]', 'Legal Regulatory', '🔍 Warranty Coverage and Guarantees', NULL, '[]', 'Utility Lockout Coordination: Direct hotline to NV Energy Emergency Operations Center for rapid grid-level meter disconnects', 35, 'high', 'b1df2d52-9464-47d9-90d9-c6ec49e50c81', '6549b4b8fb2d70c2adbbfb418a489238ace31c7eb0891a1cac83760ff527c663', 'text-embedding-3-small', 'ai', 'small', NULL, 'admin');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('9b4fa2ee95347216bf05c78fbfc7e9edd858b326f79aa8c6bc34017d78392a7e', 'admin', 'This appendix records archival state filings, calibration logs, and jurisdiction-specific regulatory code provisions.

Apex Solar Solutions Inc. — Confidential & Proprietary Operational Manual

Page 4 of 5
```

---', 'v1787142755667', '2026-08-19 12:34:41', '["warranty-coverage-and-guarantees","apex-solar-solutions-inc","proprietary-operational-manual-page","legal-regulatory","jurisdiction-specific","apex solar solutions inc","confidential","see-chunk-37"]', 'Legal Regulatory', '🔍 Warranty Coverage and Guarantees', NULL, '[]', 'This appendix records archival state filings, calibration logs, and jurisdiction-specific regulatory code provisions', 36, 'high', 'b1df2d52-9464-47d9-90d9-c6ec49e50c81', '6ae02972633e45a6814e904732dc188bf84bd396d61bfbf517eb18eb352562e6', 'text-embedding-3-small', 'ai', 'small', NULL, 'admin');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('6a9d730b7688503fcd244c0db839d6bb6fb8e5033800c958251ec564545bd17f', 'admin', '```markdown
APEX SOLAR SOLUTIONS — 2026 CORPORATE GOVERNANCE & OPERATIONS MANUAL

SUPPLEMENTAL APPENDIX — REGULATORY COMPLIANCE & VERIFICATION DATA

This appendix records archival state filings, calibration logs, and jurisdiction-specific regulatory code provisions.

Apex Solar Solutions Inc. — Confidential & Proprietary Operational Manual                        Page 5 of 5
```', 'v1787142755667', '2026-08-19 12:34:41', '["APEX","SOLAR","MANUAL","DATA","apex-solar-solutions-inc","legal-regulatory","legal","compliance"]', 'Legal Regulatory', '📝 Medium Chunk', NULL, '[]', '```markdown
APEX SOLAR SOLUTIONS — 2026 CORPORATE GOVERNANCE & OPERATIONS MANUAL

SUPPLEMENTAL APPENDIX — REGULATORY COMPLIANCE & VERIFICATION DATA

This appendix records archival state filings, calib', 37, 'high', 'b1df2d52-9464-47d9-90d9-c6ec49e50c81', '8a1e45fb22d606ccf25ef1e03670855df9003495330250c51ccfe76afdcb734e', 'text-embedding-3-small', 'ai', 'small', NULL, 'admin');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('7b68808224ac57ba9280c07fcb33765ff54765083035e2644abf9ba6f4799917', 'admin', '```markdown
APEX SOLAR SOLUTIONS — 2026 CORPORATE GOVERNANCE & OPERATIONS MANUAL

SUPPLEMENTAL APPENDIX — REGULATORY COMPLIANCE & VERIFICATION DATA

This appendix records archival state filings, calibration logs, and jurisdiction-specific regulatory code provisions.

Apex Solar Solutions Inc. — Confidential & Proprietary Operational Manual                        Page 5 of 5
```', 'v1787142755667', '2026-08-19 12:34:41', '["corporate-compliance-and-ethical-marketing","APEX","SOLAR","MANUAL","DATA","apex-solar-solutions-inc","legal-regulatory","legal"]', 'Legal Regulatory', '🔍 Corporate Compliance and Ethical Marketing', NULL, '[]', '```markdown
APEX SOLAR SOLUTIONS — 2026 CORPORATE GOVERNANCE & OPERATIONS MANUAL

SUPPLEMENTAL APPENDIX — REGULATORY COMPLIANCE & VERIFICATION DATA

This appendix records archival state filings, calib', 38, 'high', 'b1df2d52-9464-47d9-90d9-c6ec49e50c81', '8a1e45fb22d606ccf25ef1e03670855df9003495330250c51ccfe76afdcb734e', 'text-embedding-3-small', 'ai', 'small', NULL, 'admin');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('efcb25c8a641e1013a0536f76bc3e4177e77c1e5c65417bee873949a98deadcf', 'admin', '```markdown
# APEX SOLAR SOLUTIONS — EXECUTIVE CUSTOMER OPERATIONS & NEM HANDBOOK

**Comprehensive Homeowner Journey, Engineering Blueprints, Roof Integrity Protocols & Warranty Specifications**

## STAGE 1: PROJECT INITIATION, DRONE SURVEY & 3D ROOF MAPPING

Welcome to Apex Solar Solutions. This Handbook outlines the exact operational timeline, inspection phases, safety protocols, and utility handshakes for your residential solar installation:

**Milestone 1 — 3D Drone LiDAR Inspection:** Completed within 3 to 5 business days of contract execution. Drone pilots capture high-resolution imagery and point-cloud elevation data to calculate solar irradiance, roof tilt, and rafter spans.

**Milestone 2 — Attic & Electrical Panel Assessment:** Field technicians inspect attic truss integrity, electrical meter service drop, grounding electrodes, and existing circuit breaker allocations.

**Milestone 3 — Structural Engineering Calculation:** Structural calculations stamped by Nevada licensed civil engineer verifying total dead load does not exceed 3.0 lbs/sq.ft.

## STAGE 2: CAD BLUEPRINT DESIGN & ELECTRICAL SINGLE-LINE DIAGRAMS

**Electrical Single Line Diagram (SLD):** Drafted in accordance with NEC 2023 Article 690 & 705. Specifies string sizing, conductor capacity, and rapid shutdown boundary.

**Panel Layout Optimization:** 3D modeling ensures modules are oriented towards South (180° azimuth) and West (270° azimuth) to maximize peak afternoon generation under Nevada NEM Tier 4 rates.

**Setback Compliance:** Adheres to International Fire Code (IFC 2021 Section 1205) maintaining 36-inch clear ridge pathways for emergency fire ventilation.

## STAGE 3: JURISDICTIONAL PERMITTING & MUNICIPAL APPROVAL

**Clark County Department of Building & Fire Prevention:** Average permitting turnaround: 7 to 12 business days via the Citizen Access portal.

**City of Las Vegas Building & Safety:** Average permitting turnaround: 5 to 8 business days with electronic plan review (EPR).

**City of Henderson Development Services:** Average permitting turnaround: 5 to 7 business days via Henderson Express portal.

**City of North Las Vegas:** Average permitting turnaround: 6 to 10 business days.

## STAGE 4: PHYSICAL INSTALLATION EXECUTION & WORKMANSHIP STANDARDS

**Installation Duration:** Standard residential system (6 KW to 15 KW) completed in 1 to 2 days by NABCEP-certified crew.

**Summer Heat Operations Directive:** Crew operates from 6:00 AM to 2:30 PM between June and September to prevent roof tile thermal cracking and ensure crew safety.

**Tile Roof Preservation Technology:** SnapNrack Tile Hook and Quick Mount PV Tile Replacement Flashings eliminate tile drilling and guarantee zero broken tiles.

**Sealant Material Standard:** ChemLink M-1 UV-resistant polyether structural sealant rated for continuous temperatures up to 200°F.

*Apex Solar Solutions Inc. — Confidential & Proprietary Operational Manual*
Page 1 of 5
```

```markdown
# APEX SOLAR SOLUTIONS — EXECUTIVE CUSTOMER OPERATIONS & NEM HANDBOOK

## STAGE 5: MUNICIPAL ELECTRICAL INSPECTIONS & CODE COMPLIANCE

**Rough Electrical Inspection:** Municipal inspector reviews grounding electrode conductors (GEC), equipment grounding conductors (EGC), and conduit expansion joints.

**Final Electrical & Building Inspection:** Scheduled within 48 hours of physical install completion. Verification of directory placard, breaker labels, and rapid shutdown switch.', 'v1787142901638', '2026-08-19 12:35:41', '["apex-solar-solutions-executive-customer-operations","stage-1-project-initiation-drone-survey-3d-roof-ma","stage-2-cad-blueprint-design-electrical-single-lin","stage-3-jurisdictional-permitting-municipal-approv","stage-4-physical-installation-execution-workmanshi","stage-5-municipal-electrical-inspections-code-comp","APEX","SOLAR"]', 'Prose Standard', '📄 APEX SOLAR SOLUTIONS — EXECUTIVE CUSTOMER OPERATIONS & NEM HANDBOOK', ' 3.0', '[]', '```markdown
# APEX SOLAR SOLUTIONS — EXECUTIVE CUSTOMER OPERATIONS & NEM HANDBOOK

**Comprehensive Homeowner Journey, Engineering Blueprints, Roof Integrity Protocols & Warranty Specifications**

## S', 0, 'high', '363b1274-a935-4f13-a3d6-d8edce2434d4', '2dc9ce55ba36c99418ee2377fab8f9af01a635108f08a19d388e8b07b819b14d', 'text-embedding-3-small', 'ai', 'small', NULL, 'admin');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('73f48b6f271247cba9f23319ca8c31855b086321610fb4bea5da47e043102542', 'admin', '```markdown
# APEX SOLAR SOLUTIONS — EXECUTIVE CUSTOMER OPERATIONS & NEM HANDBOOK

**Comprehensive Homeowner Journey, Engineering Blueprints, Roof Integrity Protocols & Warranty Specifications**

## STAGE 1: PROJECT INITIATION, DRONE SURVEY & 3D ROOF MAPPING

Welcome to Apex Solar Solutions. This Handbook outlines the exact operational timeline, inspection phases, safety protocols, and utility handshakes for your residential solar installation:

**Milestone 1 — 3D Drone LiDAR Inspection:** Completed within 3 to 5 business days of contract execution. Drone pilots capture high-resolution imagery and point-cloud elevation data to calculate solar irradiance, roof tilt, and rafter spans.

**Milestone 2 — Attic & Electrical Panel Assessment:** Field technicians inspect attic truss integrity, electrical meter service drop, grounding electrodes, and existing circuit breaker allocations.

**Milestone 3 — Structural Engineering Calculation:** Structural calculations stamped by Nevada licensed civil engineer verifying total dead load does not exceed 3.0 lbs/sq.ft.

## STAGE 2: CAD BLUEPRINT DESIGN & ELECTRICAL SINGLE-LINE DIAGRAMS

**Electrical Single Line Diagram (SLD):** Drafted in accordance with NEC 2023 Article 690 & 705. Specifies string sizing, conductor capacity, and rapid shutdown boundary.', 'v1787142901638', '2026-08-19 12:35:41', '["apex-solar-solutions-executive-customer-operations","stage-1-project-initiation-drone-survey-3d-roof-ma","stage-2-cad-blueprint-design-electrical-single-lin","APEX","SOLAR","NEM","STAGE","DRONE"]', 'Prose Standard', '📝 APEX SOLAR SOLUTIONS — EXECUTIVE CUSTOMER OPERATIONS & NEM HANDBOOK', ' 3.0', '[]', '```markdown
# APEX SOLAR SOLUTIONS — EXECUTIVE CUSTOMER OPERATIONS & NEM HANDBOOK

**Comprehensive Homeowner Journey, Engineering Blueprints, Roof Integrity Protocols & Warranty Specifications**

## S', 1, 'high', '363b1274-a935-4f13-a3d6-d8edce2434d4', 'af9661b315dab6d5f2c2e298c964f2f059807134697f134ea15675cea9c6b46f', 'text-embedding-3-small', 'ai', 'small', NULL, 'admin');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('6609d204b4e8db3539811592f73e41a8c2d49655ee3d5ec08f3d1a69029aa27c', 'admin', '```markdown
# APEX SOLAR SOLUTIONS — EXECUTIVE CUSTOMER OPERATIONS & NEM HANDBOOK

**Comprehensive Homeowner Journey, Engineering Blueprints, Roof Integrity Protocols & Warranty Specifications**

## STAGE 1: PROJECT INITIATION, DRONE SURVEY & 3D ROOF MAPPING

Welcome to Apex Solar Solutions.

This Handbook outlines the exact operational timeline, inspection phases, safety protocols, and utility handshakes for your residential solar installation:', 'v1787142901638', '2026-08-19 12:35:41', '["project-initiation-and-drone-survey","apex-solar-solutions-executive-customer-operations","stage-1-project-initiation-drone-survey-3d-roof-ma","APEX","SOLAR","NEM","STAGE","DRONE"]', 'Prose Standard', '🔍 Project Initiation and Drone Survey', NULL, '[]', '```markdown
# APEX SOLAR SOLUTIONS — EXECUTIVE CUSTOMER OPERATIONS & NEM HANDBOOK

**Comprehensive Homeowner Journey, Engineering Blueprints, Roof Integrity Protocols & Warranty Specifications**

## S', 2, 'high', '363b1274-a935-4f13-a3d6-d8edce2434d4', 'aed3b5580000760f3d1b1d46f9030f17a18c2412385b512bff2d98dfae2bdd2c', 'text-embedding-3-small', 'ai', 'small', NULL, 'admin');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('32e564d9145f13e0e6aeb21015223b523925e18632b8992cd6809778a80ca07f', 'admin', '**Milestone 1 — 3D Drone LiDAR Inspection:** Completed within 3 to 5 business days of contract execution.

Drone pilots capture high-resolution imagery and point-cloud elevation data to calculate solar irradiance, roof tilt, and rafter spans.

**Milestone 2 — Attic & Electrical Panel Assessment:** Field technicians inspect attic truss integrity, electrical meter service drop, grounding electrodes, and existing circuit breaker allocations.', 'v1787142901638', '2026-08-19 12:35:41', '["project-initiation-and-drone-survey","electrical-panel-assessment","prose-standard","timeline","deadline","milestone","drone","inspection"]', 'Prose Standard', '🔍 Project Initiation and Drone Survey', NULL, '[]', '**Milestone 1 — 3D Drone LiDAR Inspection:** Completed within 3 to 5 business days of contract execution', 3, 'high', '363b1274-a935-4f13-a3d6-d8edce2434d4', '7ba3707ba355e40c564d1962dd4350bf60b171ff7e9c9d1fb7cd2562efd7a40e', 'text-embedding-3-small', 'ai', 'small', NULL, 'admin');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('a711924d77d12ccca3bf667a14b6d96f8a711afe0929e8caf98c33b67a3dc340', 'admin', '**Milestone 3 — Structural Engineering Calculation:** Structural calculations stamped by Nevada licensed civil engineer verifying total dead load does not exceed 3.0 lbs/sq.ft.

## STAGE 2: CAD BLUEPRINT DESIGN & ELECTRICAL SINGLE-LINE DIAGRAMS

**Electrical Single Line Diagram (SLD):** Drafted in accordance with NEC 2023 Article 690 & 705.

Specifies string sizing, conductor capacity, and rapid shutdown boundary.', 'v1787142901638', '2026-08-19 12:35:41', '["project-initiation-and-drone-survey","stage-2-cad-blueprint-design-electrical-single-lin","STAGE","CAD","DESIGN","SINGLE","LINE","SLD"]', 'Prose Standard', '🔍 Project Initiation and Drone Survey', ' 3.0', '[]', '**Milestone 3 — Structural Engineering Calculation:** Structural calculations stamped by Nevada licensed civil engineer verifying total dead load does not exceed 3', 4, 'high', '363b1274-a935-4f13-a3d6-d8edce2434d4', 'ddec9699c3fc01c3f4c06af24c896c0ed71ea4229fb20b80e08e30f3a8d538b1', 'text-embedding-3-small', 'ai', 'small', NULL, 'admin');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('98a94cee37782f42d76b9310e14d9b68993f277f5ebce244e096a9ce2e09b4c7', 'admin', '**Panel Layout Optimization:** 3D modeling ensures modules are oriented towards South (180° azimuth) and West (270° azimuth) to maximize peak afternoon generation under Nevada NEM Tier 4 rates.

**Setback Compliance:** Adheres to International Fire Code (IFC 2021 Section 1205) maintaining 36-inch clear ridge pathways for emergency fire ventilation.

## STAGE 3: JURISDICTIONAL PERMITTING & MUNICIPAL APPROVAL

**Clark County Department of Building & Fire Prevention:** Average permitting turnaround: 7 to 12 business days via the Citizen Access portal.

**City of Las Vegas Building & Safety:** Average permitting turnaround: 5 to 8 business days with electronic plan review (EPR).

**City of Henderson Development Services:** Average permitting turnaround: 5 to 7 business days via Henderson Express portal.

**City of North Las Vegas:** Average permitting turnaround: 6 to 10 business days.

## STAGE 4: PHYSICAL INSTALLATION EXECUTION & WORKMANSHIP STANDARDS

**Installation Duration:** Standard residential system (6 KW to 15 KW) completed in 1 to 2 days by NABCEP-certified crew.

**Summer Heat Operations Directive:** Crew operates from 6:00 AM to 2:30 PM between June and September to prevent roof tile thermal cracking and ensure crew safety.', 'v1787142901638', '2026-08-19 12:35:41', '["stage-3-jurisdictional-permitting-municipal-approv","stage-4-physical-installation-execution-workmanshi","NEM","IFC","STAGE","EPR","KW","NABCEP"]', 'Prose Standard', '📝 STAGE 3: JURISDICTIONAL PERMITTING & MUNICIPAL APPROVAL', NULL, '[]', '**Panel Layout Optimization:** 3D modeling ensures modules are oriented towards South (180° azimuth) and West (270° azimuth) to maximize peak afternoon generation under Nevada NEM Tier 4 rates', 5, 'high', '363b1274-a935-4f13-a3d6-d8edce2434d4', '8fdafc8f3d147fe2a00989251612de1a1dc016a1b94dcf1707aa403d5e2acdc9', 'text-embedding-3-small', 'ai', 'small', NULL, 'admin');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('c296073b1bbab5d3e9b2a43a0892833f7c753b377f89cc92db1bb035e328e3e4', 'admin', '**Panel Layout Optimization:** 3D modeling ensures modules are oriented towards South (180° azimuth) and West (270° azimuth) to maximize peak afternoon generation under Nevada NEM Tier 4 rates.

**Setback Compliance:** Adheres to International Fire Code (IFC 2021 Section 1205) maintaining 36-inch clear ridge pathways for emergency fire ventilation.

## STAGE 3: JURISDICTIONAL PERMITTING & MUNICIPAL APPROVAL', 'v1787142901638', '2026-08-19 12:35:41', '["cad-design-and-electrical-diagrams","stage-3-jurisdictional-permitting-municipal-approv","CAD","NEM","IFC","STAGE","design-and-electrical-diagrams","panel-layout-optimization"]', 'Prose Standard', '🔍 CAD Design and Electrical Diagrams', NULL, '[]', '**Panel Layout Optimization:** 3D modeling ensures modules are oriented towards South (180° azimuth) and West (270° azimuth) to maximize peak afternoon generation under Nevada NEM Tier 4 rates', 6, 'high', '363b1274-a935-4f13-a3d6-d8edce2434d4', 'ef2989f28ce787a089633ed5afff1abe52b1577ba4b2f0d26a6488fdd328ace0', 'text-embedding-3-small', 'ai', 'small', NULL, 'admin');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('fa1bbe5d8c4efbb961ffc9f4f506db46bb88312122a8ed87e786037b0929128c', 'admin', '**Clark County Department of Building & Fire Prevention:** Average permitting turnaround: 7 to 12 business days via the Citizen Access portal.

**City of Las Vegas Building & Safety:** Average permitting turnaround: 5 to 8 business days with electronic plan review (EPR).

**City of Henderson Development Services:** Average permitting turnaround: 5 to 7 business days via Henderson Express portal.', 'v1787142901638', '2026-08-19 12:35:41', '["cad-design-and-electrical-diagrams","CAD","EPR","design-and-electrical-diagrams","clark-county-department","fire-prevention","prose-standard","timeline"]', 'Prose Standard', '🔍 CAD Design and Electrical Diagrams', NULL, '[]', '**Clark County Department of Building & Fire Prevention:** Average permitting turnaround: 7 to 12 business days via the Citizen Access portal', 7, 'high', '363b1274-a935-4f13-a3d6-d8edce2434d4', 'f5a2830c21cd86ed38ac2599f0423344904a49daf139c21a47afad026b9f6f2c', 'text-embedding-3-small', 'ai', 'small', NULL, 'admin');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('6b2deffec507080a83464238a3ac9d61c2a331bce2c06ccae24d0f68740eaa18', 'admin', '**City of North Las Vegas:** Average permitting turnaround: 6 to 10 business days.

## STAGE 4: PHYSICAL INSTALLATION EXECUTION & WORKMANSHIP STANDARDS

**Installation Duration:** Standard residential system (6 KW to 15 KW) completed in 1 to 2 days by NABCEP-certified crew.

**Summer Heat Operations Directive:** Crew operates from 6:00 AM to 2:30 PM between June and September to prevent roof tile thermal cracking and ensure crew safety.', 'v1787142901638', '2026-08-19 12:35:41', '["cad-design-and-electrical-diagrams","stage-4-physical-installation-execution-workmanshi","CAD","STAGE","KW","NABCEP","AM","PM"]', 'Prose Standard', '🔍 CAD Design and Electrical Diagrams', NULL, '[]', '**City of North Las Vegas:** Average permitting turnaround: 6 to 10 business days', 8, 'high', '363b1274-a935-4f13-a3d6-d8edce2434d4', '8bdc4e4bb40c591ece309bc0decf53e7475045741d3906fe2e6700f8d4b6b6a5', 'text-embedding-3-small', 'ai', 'small', NULL, 'admin');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('cdd82f1b8d29ad7cd457cc5f98c6abdaeeb05777ab571344e098c578ab72f239', 'admin', '**Tile Roof Preservation Technology:** SnapNrack Tile Hook and Quick Mount PV Tile Replacement Flashings eliminate tile drilling and guarantee zero broken tiles.

**Sealant Material Standard:** ChemLink M-1 UV-resistant polyether structural sealant rated for continuous temperatures up to 200°F.

*Apex Solar Solutions Inc. — Confidential & Proprietary Operational Manual*
Page 1 of 5
```

```markdown
# APEX SOLAR SOLUTIONS — EXECUTIVE CUSTOMER OPERATIONS & NEM HANDBOOK

## STAGE 5: MUNICIPAL ELECTRICAL INSPECTIONS & CODE COMPLIANCE

**Rough Electrical Inspection:** Municipal inspector reviews grounding electrode conductors (GEC), equipment grounding conductors (EGC), and conduit expansion joints.

**Final Electrical & Building Inspection:** Scheduled within 48 hours of physical install completion. Verification of directory placard, breaker labels, and rapid shutdown switch.', 'v1787142901638', '2026-08-19 12:35:41', '["apex-solar-solutions-executive-customer-operations","stage-5-municipal-electrical-inspections-code-comp","PV","UV","APEX","SOLAR","NEM","STAGE"]', 'Prose Standard', '📝 APEX SOLAR SOLUTIONS — EXECUTIVE CUSTOMER OPERATIONS & NEM HANDBOOK', NULL, '[]', '**Tile Roof Preservation Technology:** SnapNrack Tile Hook and Quick Mount PV Tile Replacement Flashings eliminate tile drilling and guarantee zero broken tiles', 9, 'high', '363b1274-a935-4f13-a3d6-d8edce2434d4', '5f139087eb7cb0b4e6f41ab8c2a19e575bb38b7e7d98cf2fde84d3ed67cb11a5', 'text-embedding-3-small', 'ai', 'small', NULL, 'admin');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('72b0ddce059ce0b1d330deaf70a3b4c449b20d871a15d7c8782eb0a1a67ecf7e', 'admin', '**Tile Roof Preservation Technology:** SnapNrack Tile Hook and Quick Mount PV Tile Replacement Flashings eliminate tile drilling and guarantee zero broken tiles.

**Sealant Material Standard:** ChemLink M-1 UV-resistant polyether structural sealant rated for continuous temperatures up to 200°F.

*Apex Solar Solutions Inc. — Confidential & Proprietary Operational Manual*
Page 1 of 5
```', 'v1787142901638', '2026-08-19 12:35:41', '["jurisdictional-permitting-process","PV","UV","procedure","tile-roof-preservation-technology","tile-hook-and-quick-mount","prose-standard","tile roof preservation technology"]', 'Prose Standard', '🔍 Jurisdictional Permitting Process', NULL, '[]', '**Tile Roof Preservation Technology:** SnapNrack Tile Hook and Quick Mount PV Tile Replacement Flashings eliminate tile drilling and guarantee zero broken tiles', 10, 'high', '363b1274-a935-4f13-a3d6-d8edce2434d4', '913e37da7a66ea53bace0c024e0e1939f1d58f4d4cfceeb58a146fdb60d8e731', 'text-embedding-3-small', 'ai', 'small', NULL, 'admin');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('727a3b07ed8b502ae56958710c76a90a79a61bfefb1d257a32cc1160647246d1', 'admin', '```markdown
# APEX SOLAR SOLUTIONS — EXECUTIVE CUSTOMER OPERATIONS & NEM HANDBOOK

## STAGE 5: MUNICIPAL ELECTRICAL INSPECTIONS & CODE COMPLIANCE

**Rough Electrical Inspection:** Municipal inspector reviews grounding electrode conductors (GEC), equipment grounding conductors (EGC), and conduit expansion joints.

**Final Electrical & Building Inspection:** Scheduled within 48 hours of physical install completion.', 'v1787142901638', '2026-08-19 12:35:41', '["jurisdictional-permitting-process","apex-solar-solutions-executive-customer-operations","stage-5-municipal-electrical-inspections-code-comp","APEX","SOLAR","NEM","STAGE","CODE"]', 'Prose Standard', '🔍 Jurisdictional Permitting Process', NULL, '[]', '```markdown
# APEX SOLAR SOLUTIONS — EXECUTIVE CUSTOMER OPERATIONS & NEM HANDBOOK

## STAGE 5: MUNICIPAL ELECTRICAL INSPECTIONS & CODE COMPLIANCE

**Rough Electrical Inspection:** Municipal inspector ', 11, 'high', '363b1274-a935-4f13-a3d6-d8edce2434d4', '3a8d555a0e6b4a5b7c23491c378e01dd62cbc81a79c32a64fbfb19d4e6e4bb27', 'text-embedding-3-small', 'ai', 'small', NULL, 'admin');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('10d3fc7b810efa3b219df69e0a03e988d5f8f11f6fbe2c161a6d3679c758aac3', 'admin', 'Verification of directory placard, breaker labels, and rapid shutdown switch.', 'v1787142901638', '2026-08-19 12:35:41', '["jurisdictional-permitting-process","procedure","prose-standard","verification"]', 'Prose Standard', '🔍 Jurisdictional Permitting Process', NULL, '[]', 'Verification of directory placard, breaker labels, and rapid shutdown switch', 12, 'high', '363b1274-a935-4f13-a3d6-d8edce2434d4', '935a316fdff3d83d22ecd876fd63613eba81ff8f4c1a35a42109341430d02196', 'text-embedding-3-small', 'ai', 'small', NULL, 'admin');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('8fd0cc22e041394642603e9ee8571711a8d9af1dd5ab8206e6ebc176499730ec', 'admin', '## STAGE 6: NV ENERGY INTERCONNECTION & PERMISSION TO OPERATE (PTO)

**Net Metering Application Submission:** Apex submits the final signed inspection sign-off to NV Energy within 24 hours of passing city/county inspection.

**Bidirectional Meter Installation:** NV Energy field technicians install the bidirectional smart meter within 15 to 20 business days.

**System Energization Permission:** Homeowners receive the official PTO approval letter via email, authorizing turning on the main solar breaker.

## STAGE 7: MOBILE MONITORING APP & HOMEOWNER ENERGIZATION

**Apex Energy Pulse App Setup:** Downloadable from iOS App Store and Google Play. Homeowner receives automated login credentials upon PTO.

**Real-Time Telemetry:** Displays live solar generation (KW), home consumption (KW), net grid import/export, and battery state of charge (%).

**Wi-Fi Reconnection Protocol:** Press the WPS button on the Apex Gateway for 5 seconds to pair with updated home router credentials.

## STAGE 8: BILLING CYCLES, INVOICING MILESTONES & DISCOUNTS

**Milestone 1 (Contract Signing):** $500 refundable deposit.

**Milestone 2 (Permit Issuance):** 30% of contract balance.

**Milestone 3 (Substantial Installation):** 50% of contract balance.

**Milestone 4 (NV Energy PTO):** Final 20% contract balance.

**ACH Discount Terms:** 3.5% discount applied upon electronic funds transfer within 5 business days.

## STAGE 9: POST-INSTALLATION CARE & ANNUAL MAINTENANCE ADVISORY

**Quarterly Self-Inspection Checklist:** Check gateway LED status (Solid Green = Normal), clear debris from panel underside, inspect conduit for physical disturbance.

**Annual Professional Tune-Up:** Complimentary Year 1 inspection by Apex technician to check torque on electrical terminals and verify string voltages.

*Apex Solar Solutions Inc. — Confidential & Proprietary Operational Manual*
Page 2 of 5
```

---

```markdown
# APEX SOLAR SOLUTIONS — EXECUTIVE CUSTOMER OPERATIONS & NEM HANDBOOK

## SUPPLEMENTAL APPENDIX — REGULATORY COMPLIANCE & VERIFICATION DATA

This appendix records archival state filings, calibration logs, and jurisdiction-specific regulatory code provisions.

Apex Solar Solutions Inc. — Confidential & Proprietary Operational Manual   Page 3 of 5
```

```markdown
# APEX SOLAR SOLUTIONS — EXECUTIVE CUSTOMER OPERATIONS & NEM HANDBOOK

## SUPPLEMENTAL APPENDIX — REGULATORY COMPLIANCE & VERIFICATION DATA

This appendix records archival state filings, calibration logs, and jurisdiction-specific regulatory code provisions.

Apex Solar Solutions Inc. — Confidential & Proprietary Operational Manual   Page 4 of 5
```

---

```markdown
APEX SOLAR SOLUTIONS — EXECUTIVE CUSTOMER OPERATIONS & NEM HANDBOOK

SUPPLEMENTAL APPENDIX — REGULATORY COMPLIANCE & VERIFICATION DATA

This appendix records archival state filings, calibration logs, and jurisdiction-specific regulatory code provisions.

Apex Solar Solutions Inc. — Confidential & Proprietary Operational Manual                              Page 5 of 5
```', 'v1787142901638', '2026-08-19 12:35:41', '["stage-6-nv-energy-interconnection-permission-to-op","stage-7-mobile-monitoring-app-homeowner-energizati","stage-8-billing-cycles-invoicing-milestones-discou","stage-9-post-installation-care-annual-maintenance-","apex-solar-solutions-executive-customer-operations","supplemental-appendix-regulatory-compliance-verifi","STAGE","NV"]', 'Prose Standard', '📄 STAGE 6: NV ENERGY INTERCONNECTION & PERMISSION TO OPERATE (PTO)', '3.5', '[]', '## STAGE 6: NV ENERGY INTERCONNECTION & PERMISSION TO OPERATE (PTO)

**Net Metering Application Submission:** Apex submits the final signed inspection sign-off to NV Energy within 24 hours of passing ', 13, 'high', '363b1274-a935-4f13-a3d6-d8edce2434d4', '48df5eae04f6972a4930e5030500b9cfcb931e44a8c7c9ebf908af16fca58cef', 'text-embedding-3-small', 'ai', 'small', NULL, 'admin');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('ebb9d5b2bb1f1e14fbb8cd34356c2c5e80cd5af8654e1ac261928e0f84c6f548', 'admin', '## STAGE 6: NV ENERGY INTERCONNECTION & PERMISSION TO OPERATE (PTO)

**Net Metering Application Submission:** Apex submits the final signed inspection sign-off to NV Energy within 24 hours of passing city/county inspection.

**Bidirectional Meter Installation:** NV Energy field technicians install the bidirectional smart meter within 15 to 20 business days.

**System Energization Permission:** Homeowners receive the official PTO approval letter via email, authorizing turning on the main solar breaker.

## STAGE 7: MOBILE MONITORING APP & HOMEOWNER ENERGIZATION

**Apex Energy Pulse App Setup:** Downloadable from iOS App Store and Google Play. Homeowner receives automated login credentials upon PTO.

**Real-Time Telemetry:** Displays live solar generation (KW), home consumption (KW), net grid import/export, and battery state of charge (%).

**Wi-Fi Reconnection Protocol:** Press the WPS button on the Apex Gateway for 5 seconds to pair with updated home router credentials.

## STAGE 8: BILLING CYCLES, INVOICING MILESTONES & DISCOUNTS

**Milestone 1 (Contract Signing):** $500 refundable deposit.

**Milestone 2 (Permit Issuance):** 30% of contract balance.

**Milestone 3 (Substantial Installation):** 50% of contract balance.

**Milestone 4 (NV Energy PTO):** Final 20% contract balance.', 'v1787142901638', '2026-08-19 12:35:41', '["stage-6-nv-energy-interconnection-permission-to-op","stage-7-mobile-monitoring-app-homeowner-energizati","stage-8-billing-cycles-invoicing-milestones-discou","STAGE","NV","ENERGY","TO","PTO"]', 'Prose Standard', '📝 STAGE 6: NV ENERGY INTERCONNECTION & PERMISSION TO OPERATE (PTO)', NULL, '[]', '## STAGE 6: NV ENERGY INTERCONNECTION & PERMISSION TO OPERATE (PTO)

**Net Metering Application Submission:** Apex submits the final signed inspection sign-off to NV Energy within 24 hours of passing ', 14, 'high', '363b1274-a935-4f13-a3d6-d8edce2434d4', '3dd4cce129b451a4ff76c681477859f413479305ebe25e6fa3dd7510139f211e', 'text-embedding-3-small', 'ai', 'small', NULL, 'admin');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('771872d8ffe7303cfaf63c5237e604b01ab4208d8808d2bf5c35979c067c0c35', 'admin', '## STAGE 6: NV ENERGY INTERCONNECTION & PERMISSION TO OPERATE (PTO)

**Net Metering Application Submission:** Apex submits the final signed inspection sign-off to NV Energy within 24 hours of passing city/county inspection.

**Bidirectional Meter Installation:** NV Energy field technicians install the bidirectional smart meter within 15 to 20 business days.', 'v1787142901638', '2026-08-19 12:35:41', '["nv-energy-interconnection-process","NV","STAGE","ENERGY","TO","PTO","procedure","energy-interconnection-process"]', 'Prose Standard', '🔍 NV Energy Interconnection Process', NULL, '[]', '## STAGE 6: NV ENERGY INTERCONNECTION & PERMISSION TO OPERATE (PTO)

**Net Metering Application Submission:** Apex submits the final signed inspection sign-off to NV Energy within 24 hours of passing ', 15, 'high', '363b1274-a935-4f13-a3d6-d8edce2434d4', 'f0768c0b3ec0126f3694edc307ed833c0b1072973f40d5c2392701c02ad9e91b', 'text-embedding-3-small', 'ai', 'small', NULL, 'admin');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('94b56da8f71defece85c7fb95602ccbcb4d2fa85bc85b528ee444c66d226dca3', 'admin', '**System Energization Permission:** Homeowners receive the official PTO approval letter via email, authorizing turning on the main solar breaker.

## STAGE 7: MOBILE MONITORING APP & HOMEOWNER ENERGIZATION

**Apex Energy Pulse App Setup:** Downloadable from iOS App Store and Google Play.

Homeowner receives automated login credentials upon PTO.', 'v1787142901638', '2026-08-19 12:35:41', '["nv-energy-interconnection-process","stage-7-mobile-monitoring-app-homeowner-energizati","NV","PTO","STAGE","MOBILE","APP","procedure"]', 'Prose Standard', '🔍 NV Energy Interconnection Process', NULL, '[]', '**System Energization Permission:** Homeowners receive the official PTO approval letter via email, authorizing turning on the main solar breaker', 16, 'high', '363b1274-a935-4f13-a3d6-d8edce2434d4', '2a975df76a68cc5cc4de3c27f9a4aa5fa0ab34c3b6481fccf81e00107af93e26', 'text-embedding-3-small', 'ai', 'small', NULL, 'admin');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('cb3818aaceba469f9630f8bb267ca7669997945b7e8098789cbf0f75c92388bb', 'admin', '**Real-Time Telemetry:** Displays live solar generation (KW), home consumption (KW), net grid import/export, and battery state of charge (%).

**Wi-Fi Reconnection Protocol:** Press the WPS button on the Apex Gateway for 5 seconds to pair with updated home router credentials.

## STAGE 8: BILLING CYCLES, INVOICING MILESTONES & DISCOUNTS

**Milestone 1 (Contract Signing):** $500 refundable deposit.', 'v1787142901638', '2026-08-19 12:35:41', '["nv-energy-interconnection-process","stage-8-billing-cycles-invoicing-milestones-discou","NV","KW","WPS","STAGE","CYCLES","procedure"]', 'Prose Standard', '🔍 NV Energy Interconnection Process', NULL, '[]', '**Real-Time Telemetry:** Displays live solar generation (KW), home consumption (KW), net grid import/export, and battery state of charge (%)', 17, 'high', '363b1274-a935-4f13-a3d6-d8edce2434d4', '78537d3bf1370af43b1bc04483c925c73cd93be30ffc7fe1009ca348a24f50ca', 'text-embedding-3-small', 'ai', 'small', NULL, 'admin');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('00ffa2547f6df8da25be2033e4d5de25d03f03b9c8510ea5bfc6e11f142ea3e0', 'admin', '**Milestone 2 (Permit Issuance):** 30% of contract balance.

**Milestone 3 (Substantial Installation):** 50% of contract balance.

**Milestone 4 (NV Energy PTO):** Final 20% contract balance.', 'v1787142901638', '2026-08-19 12:35:41', '["nv-energy-interconnection-process","NV","PTO","procedure","energy-interconnection-process","permit-issuance","substantial-installation","prose-standard"]', 'Prose Standard', '🔍 NV Energy Interconnection Process', NULL, '[]', '**Milestone 2 (Permit Issuance):** 30% of contract balance', 18, 'high', '363b1274-a935-4f13-a3d6-d8edce2434d4', 'beebf65191564f6f715076dacb9be7079266bbdb0b29e33faf2b3e83756904a2', 'text-embedding-3-small', 'ai', 'small', NULL, 'admin');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('c270e17d04ec62522e40ddb7b69de218cb273f0f95df1fc455131545673886da', 'admin', '**ACH Discount Terms:** 3.5% discount applied upon electronic funds transfer within 5 business days.

## STAGE 9: POST-INSTALLATION CARE & ANNUAL MAINTENANCE ADVISORY

**Quarterly Self-Inspection Checklist:** Check gateway LED status (Solid Green = Normal), clear debris from panel underside, inspect conduit for physical disturbance.

**Annual Professional Tune-Up:** Complimentary Year 1 inspection by Apex technician to check torque on electrical terminals and verify string voltages.

*Apex Solar Solutions Inc. — Confidential & Proprietary Operational Manual*
Page 2 of 5
```

---

```markdown
# APEX SOLAR SOLUTIONS — EXECUTIVE CUSTOMER OPERATIONS & NEM HANDBOOK

## SUPPLEMENTAL APPENDIX — REGULATORY COMPLIANCE & VERIFICATION DATA

This appendix records archival state filings, calibration logs, and jurisdiction-specific regulatory code provisions.

Apex Solar Solutions Inc. — Confidential & Proprietary Operational Manual   Page 3 of 5
```

```markdown
# APEX SOLAR SOLUTIONS — EXECUTIVE CUSTOMER OPERATIONS & NEM HANDBOOK

## SUPPLEMENTAL APPENDIX — REGULATORY COMPLIANCE & VERIFICATION DATA

This appendix records archival state filings, calibration logs, and jurisdiction-specific regulatory code provisions.

Apex Solar Solutions Inc. — Confidential & Proprietary Operational Manual   Page 4 of 5
```

---', 'v1787142901638', '2026-08-19 12:35:41', '["stage-9-post-installation-care-annual-maintenance-","apex-solar-solutions-executive-customer-operations","supplemental-appendix-regulatory-compliance-verifi","ACH","STAGE","POST","CARE","ANNUAL"]', 'Prose Standard', '📝 STAGE 9: POST-INSTALLATION CARE & ANNUAL MAINTENANCE ADVISORY', '3.5', '[]', '**ACH Discount Terms:** 3', 19, 'high', '363b1274-a935-4f13-a3d6-d8edce2434d4', 'a1ff1cf6a4f43277862bb277e5b5d527254820d67eae33cbe0b4f1acb1c32edc', 'text-embedding-3-small', 'ai', 'small', NULL, 'admin');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('37b3fd69ea8ebf779d43eebad1ce4f467838375d066c35481cbfba9e3fa9833b', 'admin', '**ACH Discount Terms:** 3.5% discount applied upon electronic funds transfer within 5 business days.

## STAGE 9: POST-INSTALLATION CARE & ANNUAL MAINTENANCE ADVISORY

**Quarterly Self-Inspection Checklist:** Check gateway LED status (Solid Green = Normal), clear debris from panel underside, inspect conduit for physical disturbance.', 'v1787142901638', '2026-08-19 12:35:41', '["mobile-monitoring-app-features","stage-9-post-installation-care-annual-maintenance-","ACH","STAGE","POST","CARE","ANNUAL","LED"]', 'Prose Standard', '🔍 Mobile Monitoring App Features', '3.5', '[]', '**ACH Discount Terms:** 3', 20, 'high', '363b1274-a935-4f13-a3d6-d8edce2434d4', '942d18532e4fa02c12a92ba298f5643992dcd8bb01b55038604fa68aa6eddaed', 'text-embedding-3-small', 'ai', 'small', NULL, 'admin');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('68e40b7e6eb79da232448c7d408b7626ab2a8889d5938f4de25604fe5b25fe07', 'admin', '**Annual Professional Tune-Up:** Complimentary Year 1 inspection by Apex technician to check torque on electrical terminals and verify string voltages.

*Apex Solar Solutions Inc. — Confidential & Proprietary Operational Manual*
Page 2 of 5
```

---

```markdown
# APEX SOLAR SOLUTIONS — EXECUTIVE CUSTOMER OPERATIONS & NEM HANDBOOK

## SUPPLEMENTAL APPENDIX — REGULATORY COMPLIANCE & VERIFICATION DATA', 'v1787142901638', '2026-08-19 12:35:41', '["mobile-monitoring-app-features","apex-solar-solutions-executive-customer-operations","supplemental-appendix-regulatory-compliance-verifi","APEX","SOLAR","NEM","DATA","annual-professional-tune"]', 'Prose Standard', '🔍 Mobile Monitoring App Features', NULL, '[]', '**Annual Professional Tune-Up:** Complimentary Year 1 inspection by Apex technician to check torque on electrical terminals and verify string voltages', 21, 'high', '363b1274-a935-4f13-a3d6-d8edce2434d4', 'a7bbc4875c3049b4432a5957ffea200f2f51eacc711838ae3d46291f7449c736', 'text-embedding-3-small', 'ai', 'small', NULL, 'admin');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('e4c7e4f86665df6c60bf252fd02eeb020143e5c6ef09ee14dc8ba69a92e26b70', 'admin', 'This appendix records archival state filings, calibration logs, and jurisdiction-specific regulatory code provisions.

Apex Solar Solutions Inc. — Confidential & Proprietary Operational Manual   Page 3 of 5
```

```markdown
# APEX SOLAR SOLUTIONS — EXECUTIVE CUSTOMER OPERATIONS & NEM HANDBOOK

## SUPPLEMENTAL APPENDIX — REGULATORY COMPLIANCE & VERIFICATION DATA', 'v1787142901638', '2026-08-19 12:35:41', '["mobile-monitoring-app-features","apex-solar-solutions-executive-customer-operations","supplemental-appendix-regulatory-compliance-verifi","APEX","SOLAR","NEM","DATA","apex-solar-solutions-inc"]', 'Prose Standard', '🔍 Mobile Monitoring App Features', NULL, '[]', 'This appendix records archival state filings, calibration logs, and jurisdiction-specific regulatory code provisions', 22, 'high', '363b1274-a935-4f13-a3d6-d8edce2434d4', '20fbf8c30728acde145863416e264b0ca02412dcbb5b848c453a0afa9a0b7339', 'text-embedding-3-small', 'ai', 'small', NULL, 'admin');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('4ff8ed35e12b030121b1fdb9bc437408b67e82faa3920d7a07a9049e1f85e45f', 'admin', 'This appendix records archival state filings, calibration logs, and jurisdiction-specific regulatory code provisions.

Apex Solar Solutions Inc. — Confidential & Proprietary Operational Manual   Page 4 of 5
```

---', 'v1787142901638', '2026-08-19 12:35:41', '["mobile-monitoring-app-features","apex-solar-solutions-inc","proprietary-operational-manual-page","prose-standard","jurisdiction-specific","apex solar solutions inc","confidential","see-chunk-22"]', 'Prose Standard', '🔍 Mobile Monitoring App Features', NULL, '[]', 'This appendix records archival state filings, calibration logs, and jurisdiction-specific regulatory code provisions', 23, 'high', '363b1274-a935-4f13-a3d6-d8edce2434d4', '1a909600c1022ee53e54a8be8179bf0983ed2c403b9a2c40460b906a3a2980c8', 'text-embedding-3-small', 'ai', 'small', NULL, 'admin');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('2727111d821136cdd1a435e8c59e369d68fbd191e0e58aae5534360f10a4f320', 'admin', '```markdown
APEX SOLAR SOLUTIONS — EXECUTIVE CUSTOMER OPERATIONS & NEM HANDBOOK

SUPPLEMENTAL APPENDIX — REGULATORY COMPLIANCE & VERIFICATION DATA

This appendix records archival state filings, calibration logs, and jurisdiction-specific regulatory code provisions.

Apex Solar Solutions Inc. — Confidential & Proprietary Operational Manual                              Page 5 of 5
```', 'v1787142901638', '2026-08-19 12:35:41', '["APEX","SOLAR","NEM","DATA","apex-solar-solutions-inc","prose-standard","legal","compliance"]', 'Prose Standard', '📝 Medium Chunk', NULL, '[]', '```markdown
APEX SOLAR SOLUTIONS — EXECUTIVE CUSTOMER OPERATIONS & NEM HANDBOOK

SUPPLEMENTAL APPENDIX — REGULATORY COMPLIANCE & VERIFICATION DATA

This appendix records archival state filings, calibr', 24, 'high', '363b1274-a935-4f13-a3d6-d8edce2434d4', '97a4222180f66cc1c0c456cd51ceddbd91aba749f9ea1169ddcc12f0b2652d65', 'text-embedding-3-small', 'ai', 'small', NULL, 'admin');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('a09000f04c2190c5810e8514ed0fedee1fdeb69ba3f6b4e7ba9041e08f79ca33', 'admin', '```markdown
APEX SOLAR SOLUTIONS — EXECUTIVE CUSTOMER OPERATIONS & NEM HANDBOOK

SUPPLEMENTAL APPENDIX — REGULATORY COMPLIANCE & VERIFICATION DATA

This appendix records archival state filings, calibration logs, and jurisdiction-specific regulatory code provisions.

Apex Solar Solutions Inc. — Confidential & Proprietary Operational Manual                              Page 5 of 5
```', 'v1787142901638', '2026-08-19 12:35:42', '["billing-milestones-and-discounts","APEX","SOLAR","NEM","DATA","apex-solar-solutions-inc","prose-standard","legal"]', 'Prose Standard', '🔍 Billing Milestones and Discounts', NULL, '[]', '```markdown
APEX SOLAR SOLUTIONS — EXECUTIVE CUSTOMER OPERATIONS & NEM HANDBOOK

SUPPLEMENTAL APPENDIX — REGULATORY COMPLIANCE & VERIFICATION DATA

This appendix records archival state filings, calibr', 25, 'high', '363b1274-a935-4f13-a3d6-d8edce2434d4', '97a4222180f66cc1c0c456cd51ceddbd91aba749f9ea1169ddcc12f0b2652d65', 'text-embedding-3-small', 'ai', 'small', NULL, 'admin');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('9ba8068037de43fdab69b9e3f8dc787b04f14a17f3588e6d31ade98440738edf', 'admin', '```markdown
# APEX POWERVAULT 15KWH LFP — STORAGE SPECIFICATION & EMERGENCY SERVICE GUIDE

LiFePO4 Battery Chemistry, Sub-Panel Balancing, BMS Diagnostics & Emergency Bypass Protocols

## MODULE 1: ENERGY STORAGE TECHNICAL SPECIFICATIONS (MODEL: APV-15K-LFP)

**Battery Chemistry:** Lithium Iron Phosphate (LiFePO4) with prismatic cell topology — zero cobalt, zero nickel, highest thermal stability.
**Nominal Battery Energy Capacity:** 15.0 Kilowatt-Hours (kWh).
**Usable Energy Capacity (92% DoD):** 13.8 Kilowatt-Hours (kWh).
**Continuous Power Output (On-Grid & Backup):** 7.6 Kilowatts (kW) AC at 240V split-phase.
**Maximum Peak Surge Power (10 Seconds):** 11.4 Kilowatts (kW) AC (Enables starting 3.5-ton central air conditioning compressor with 55A LRA inrush current).
**Continuous Current Output:** 32.0 Amperes AC.
**Peak Current Output (10 Sec Surge):** 47.5 Amperes AC.
**Round-Trip Efficiency (RTE AC-to-AC):** 90.5% at nominal 25°C ambient.
**Internal DC Operating Voltage Range:** 44.8 Volts DC to 57.6 Volts DC (Nominal 51.2V DC bus).
**Battery Management System (BMS):** Dual-redundant Texas Instruments microcontrollers with active cell balancing, over-voltage, under-voltage, over-current, and multi-point temperature telemetry.
**Enclosure Rating & Dimensions:** NEMA 3R / IP65 outdoor wall or floor mount enclosure. 46.5 in H x 29.5 in W x 11.8 in D (1180mm x 750mm x 300mm).
**Total Unit Weight:** 142 kg (313 lbs) with modular 3-pack pull-out battery trays.

## MODULE 2: THERMAL MANAGEMENT & DESERT OPERATION SAFEGUARDS

**Operating Ambient Temperature (Discharge):** -10°C to +55°C (14°F to 131°F).
**Operating Ambient Temperature (Charge):** 0°C to +50°C (32°F to 122°F).
**Integrated Internal Thermal Heater:** 120W internal silicone heating pads automatically warm cell modules when ambient temp falls below 35°F.
**Cooling Topology:** Passive convection cooling backed by dual variable-speed brushless IP67 fans operating only above 115°F.
**UL 9540A Large Scale Fire Safety:** Certified compliant with zero thermal runaway propagation between adjacent cell groups.

## MODULE 3: BACKUP CRITICAL LOAD SUB-PANEL CONFIGURATION

The Apex Smart Gateway 3 isolates the household from the NV Energy utility grid in <20 milliseconds during an outage (seamless UPS transition):
**Sub-Panel Circuit 1 (Kitchen Essentials):** 120V / 20A dedicated breaker for main kitchen refrigerator, freezer, and island countertop outlets.
**Sub-Panel Circuit 2 (Network & Security):** 120V / 15A dedicated breaker for fiber modem, mesh Wi-Fi routers, security cameras, and smart hub.
**Sub-Panel Circuit 3 (Master Suite & Medical):** 120V / 15A dedicated breaker for master bedroom lighting, ceiling fan, and CPAP / medical devices.

* * * * *

# APEX POWERVAULT 15KWH LFP — STORAGE SPECIFICATION & EMERGENCY SERVICE GUIDE

## MODULE 4: EMERGENCY MANUAL INVERTER BYPASS PROCEDURES (STEP-BY-STEP)', 'v1787143217662', '2026-08-19 12:40:50', '["apex-powervault-15kwh-lfp-storage-specification-em","module-1-energy-storage-technical-specifications-m","module-2-thermal-management-desert-operation-safeg","module-3-backup-critical-load-sub-panel-configurat","module-4-emergency-manual-inverter-bypass-procedur","APEX","LFP","GUIDE"]', 'Code Technical', '📄 APEX POWERVAULT 15KWH LFP — STORAGE SPECIFICATION & EMERGENCY SERVICE GUIDE', '15.0', '[]', '```markdown
# APEX POWERVAULT 15KWH LFP — STORAGE SPECIFICATION & EMERGENCY SERVICE GUIDE

LiFePO4 Battery Chemistry, Sub-Panel Balancing, BMS Diagnostics & Emergency Bypass Protocols

## MODULE 1: EN', 0, 'high', '381b263d-5ae1-4bbf-bc8d-956cbaf79d91', '4b0394f662027f8ee381eff16d9e4a832d55070f874a1cc160e8a2ce8b0b149e', 'text-embedding-3-small', 'ai', 'small', NULL, 'pdf');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('75abf75c1b1b0d8419f03bee0172b1d9eae3c7dc317a32bbf2fc9fca8294890b', 'admin', '```markdown
# APEX POWERVAULT 15KWH LFP — STORAGE SPECIFICATION & EMERGENCY SERVICE GUIDE

LiFePO4 Battery Chemistry, Sub-Panel Balancing, BMS Diagnostics & Emergency Bypass Protocols

## MODULE 1: ENERGY STORAGE TECHNICAL SPECIFICATIONS (MODEL: APV-15K-LFP)', 'v1787143217662', '2026-08-19 12:40:50', '["apex-powervault-15kwh-lfp-storage-specification-em","module-1-energy-storage-technical-specifications-m","APEX","LFP","GUIDE","BMS","MODULE","ENERGY"]', 'Code Technical', '📝 APEX POWERVAULT 15KWH LFP — STORAGE SPECIFICATION & EMERGENCY SERVICE GUIDE', NULL, '[]', '```markdown
# APEX POWERVAULT 15KWH LFP — STORAGE SPECIFICATION & EMERGENCY SERVICE GUIDE

LiFePO4 Battery Chemistry, Sub-Panel Balancing, BMS Diagnostics & Emergency Bypass Protocols

## MODULE 1: EN', 1, 'high', '381b263d-5ae1-4bbf-bc8d-956cbaf79d91', '8b2008fabdec97660cf08455acce53fa7bef298cd7ac4fd0918c7945c8ed3595', 'text-embedding-3-small', 'ai', 'small', NULL, 'pdf');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('fe89f7ca3d46c327da4ddfd5f4a15031783eb6fd28d26495158fa7e74e0efa9b', 'admin', '```markdown
# APEX POWERVAULT 15KWH LFP — STORAGE SPECIFICATION & EMERGENCY SERVICE GUIDE

LiFePO4 Battery Chemistry, Sub-Panel Balancing, BMS Diagnostics & Emergency Bypass Protocols

## MODULE 1: ENERGY STORAGE TECHNICAL SPECIFICATIONS (MODEL: APV-15K-LFP)', 'v1787143217662', '2026-08-19 12:40:50', '["battery-chemistry-and-specifications","apex-powervault-15kwh-lfp-storage-specification-em","module-1-energy-storage-technical-specifications-m","APEX","LFP","GUIDE","BMS","MODULE"]', 'Code Technical', '🔍 Battery Chemistry and Specifications', NULL, '[]', '```markdown
# APEX POWERVAULT 15KWH LFP — STORAGE SPECIFICATION & EMERGENCY SERVICE GUIDE

LiFePO4 Battery Chemistry, Sub-Panel Balancing, BMS Diagnostics & Emergency Bypass Protocols

## MODULE 1: EN', 2, 'high', '381b263d-5ae1-4bbf-bc8d-956cbaf79d91', '8b2008fabdec97660cf08455acce53fa7bef298cd7ac4fd0918c7945c8ed3595', 'text-embedding-3-small', 'ai', 'small', NULL, 'pdf');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('79232ffa472ece34d11cfdbfe9c5eaa4b6b26f9f95e9d6eac81cade19f3c5bbf', 'admin', '**Battery Chemistry:** Lithium Iron Phosphate (LiFePO4) with prismatic cell topology — zero cobalt, zero nickel, highest thermal stability.
**Nominal Battery Energy Capacity:** 15.0 Kilowatt-Hours (kWh).
**Usable Energy Capacity (92% DoD):** 13.8 Kilowatt-Hours (kWh).
**Continuous Power Output (On-Grid & Backup):** 7.6 Kilowatts (kW) AC at 240V split-phase.
**Maximum Peak Surge Power (10 Seconds):** 11.4 Kilowatts (kW) AC (Enables starting 3.5-ton central air conditioning compressor with 55A LRA inrush current).
**Continuous Current Output:** 32.0 Amperes AC.
**Peak Current Output (10 Sec Surge):** 47.5 Amperes AC.
**Round-Trip Efficiency (RTE AC-to-AC):** 90.5% at nominal 25°C ambient.
**Internal DC Operating Voltage Range:** 44.8 Volts DC to 57.6 Volts DC (Nominal 51.2V DC bus).
**Battery Management System (BMS):** Dual-redundant Texas Instruments microcontrollers with active cell balancing, over-voltage, under-voltage, over-current, and multi-point temperature telemetry.
**Enclosure Rating & Dimensions:** NEMA 3R / IP65 outdoor wall or floor mount enclosure. 46.5 in H x 29.5 in W x 11.8 in D (1180mm x 750mm x 300mm).
**Total Unit Weight:** 142 kg (313 lbs) with modular 3-pack pull-out battery trays.

## MODULE 2: THERMAL MANAGEMENT & DESERT OPERATION SAFEGUARDS', 'v1787143217662', '2026-08-19 12:40:50', '["module-2-thermal-management-desert-operation-safeg","AC","LRA","RTE","DC","BMS","NEMA","MODULE"]', 'Code Technical', '📝 MODULE 2: THERMAL MANAGEMENT & DESERT OPERATION SAFEGUARDS', '15.0', '[]', '**Battery Chemistry:** Lithium Iron Phosphate (LiFePO4) with prismatic cell topology — zero cobalt, zero nickel, highest thermal stability', 3, 'high', '381b263d-5ae1-4bbf-bc8d-956cbaf79d91', '896769460d64fd84c64c8be7b56f11a88a3a3092fe39be3d113cfd9e6e2df561', 'text-embedding-3-small', 'ai', 'small', NULL, 'pdf');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('bcc75490b28c678366469d737dec494de49ab3a1817cd4fa2f1b30b9d2d43b61', 'admin', '**Battery Chemistry:** Lithium Iron Phosphate (LiFePO4) with prismatic cell topology — zero cobalt, zero nickel, highest thermal stability.
**Nominal Battery Energy Capacity:** 15.0 Kilowatt-Hours (kWh).
**Usable Energy Capacity (92% DoD):** 13.8 Kilowatt-Hours (kWh).
**Continuous Power Output (On-Grid & Backup):** 7.6 Kilowatts (kW) AC at 240V split-phase.
**Maximum Peak Surge Power (10 Seconds):** 11.4 Kilowatts (kW) AC (Enables starting 3.5-ton central air conditioning compressor with 55A LRA inrush current).
**Continuous Current Output:** 32.0 Amperes AC.
**Peak Current Output (10 Sec Surge):** 47.5 Amperes AC.
**Round-Trip Efficiency (RTE AC-to-AC):** 90.5% at nominal 25°C ambient.
**Internal DC Operating Voltage Range:** 44.8 Volts DC to 57.6 Volts DC (Nominal 51.2V DC bus).
**Battery Management System (BMS):** Dual-redundant Texas Instruments microcontrollers with active cell balancing, over-voltage, under-voltage, over-current, and multi-point temperature telemetry.
**Enclosure Rating & Dimensions:** NEMA 3R / IP65 outdoor wall or floor mount enclosure. 46.5 in H x 29.5 in W x 11.8 in D (1180mm x 750mm x 300mm).
**Total Unit Weight:** 142 kg (313 lbs) with modular 3-pack pull-out battery trays.', 'v1787143217662', '2026-08-19 12:40:50', '["thermal-management-features","AC","LRA","RTE","DC","BMS","NEMA","battery-chemistry"]', 'Code Technical', '🔍 Thermal Management Features', '15.0', '[]', '**Battery Chemistry:** Lithium Iron Phosphate (LiFePO4) with prismatic cell topology — zero cobalt, zero nickel, highest thermal stability', 4, 'high', '381b263d-5ae1-4bbf-bc8d-956cbaf79d91', '94f426b3371b38ddf29961999783a041f8a99fc07087411258a3de61f42262fc', 'text-embedding-3-small', 'ai', 'small', NULL, 'pdf');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('19b7799f8d8bb0d2e405e67cbe50188d784090fa4c7c7aa07fa74c291405ab2a', 'admin', '## MODULE 2: THERMAL MANAGEMENT & DESERT OPERATION SAFEGUARDS', 'v1787143217662', '2026-08-19 12:40:50', '["thermal-management-features","MODULE","DESERT","code-technical"]', 'Code Technical', '🔍 Thermal Management Features', NULL, '[]', '## MODULE 2: THERMAL MANAGEMENT & DESERT OPERATION SAFEGUARDS', 5, 'high', '381b263d-5ae1-4bbf-bc8d-956cbaf79d91', '6af202275035ab9465deae7fffb42c996050926bfe2d68385a95f3fb5b80690a', 'text-embedding-3-small', 'ai', 'small', NULL, 'pdf');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('0485483af10b9338fa89e5838beade6dd33cb28384bdff7135bfbff156bbcd63', 'admin', '**Operating Ambient Temperature (Discharge):** -10°C to +55°C (14°F to 131°F).
**Operating Ambient Temperature (Charge):** 0°C to +50°C (32°F to 122°F).
**Integrated Internal Thermal Heater:** 120W internal silicone heating pads automatically warm cell modules when ambient temp falls below 35°F.
**Cooling Topology:** Passive convection cooling backed by dual variable-speed brushless IP67 fans operating only above 115°F.
**UL 9540A Large Scale Fire Safety:** Certified compliant with zero thermal runaway propagation between adjacent cell groups.

## MODULE 3: BACKUP CRITICAL LOAD SUB-PANEL CONFIGURATION

The Apex Smart Gateway 3 isolates the household from the NV Energy utility grid in <20 milliseconds during an outage (seamless UPS transition):
**Sub-Panel Circuit 1 (Kitchen Essentials):** 120V / 20A dedicated breaker for main kitchen refrigerator, freezer, and island countertop outlets.
**Sub-Panel Circuit 2 (Network & Security):** 120V / 15A dedicated breaker for fiber modem, mesh Wi-Fi routers, security cameras, and smart hub.
**Sub-Panel Circuit 3 (Master Suite & Medical):** 120V / 15A dedicated breaker for master bedroom lighting, ceiling fan, and CPAP / medical devices.

* * * * *

# APEX POWERVAULT 15KWH LFP — STORAGE SPECIFICATION & EMERGENCY SERVICE GUIDE

## MODULE 4: EMERGENCY MANUAL INVERTER BYPASS PROCEDURES (STEP-BY-STEP)', 'v1787143217662', '2026-08-19 12:40:50', '["module-3-backup-critical-load-sub-panel-configurat","apex-powervault-15kwh-lfp-storage-specification-em","module-4-emergency-manual-inverter-bypass-procedur","UL","MODULE","BACKUP","LOAD","SUB"]', 'Code Technical', '📝 MODULE 3: BACKUP CRITICAL LOAD SUB-PANEL CONFIGURATION', NULL, '[]', '**Operating Ambient Temperature (Discharge):** -10°C to +55°C (14°F to 131°F)', 6, 'high', '381b263d-5ae1-4bbf-bc8d-956cbaf79d91', '8ad33229f33fbfcb03b24ff1c10ab1baf4c39d42659ec14463115093c1730671', 'text-embedding-3-small', 'ai', 'small', NULL, 'pdf');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('1eb83ca03eb766ee33c3c084b6d5da833594ebd71dbeb6c3c89019ed0b19c8f9', 'admin', '**Operating Ambient Temperature (Discharge):** -10°C to +55°C (14°F to 131°F).
**Operating Ambient Temperature (Charge):** 0°C to +50°C (32°F to 122°F).
**Integrated Internal Thermal Heater:** 120W internal silicone heating pads automatically warm cell modules when ambient temp falls below 35°F.
**Cooling Topology:** Passive convection cooling backed by dual variable-speed brushless IP67 fans operating only above 115°F.
**UL 9540A Large Scale Fire Safety:** Certified compliant with zero thermal runaway propagation between adjacent cell groups.', 'v1787143217662', '2026-08-19 12:40:50', '["backup-load-configuration","UL","operating-ambient-temperature","integrated-internal-thermal-heater","code-technical","contact-info","support","timeline"]', 'Code Technical', '🔍 Backup Load Configuration', NULL, '[]', '**Operating Ambient Temperature (Discharge):** -10°C to +55°C (14°F to 131°F)', 7, 'high', '381b263d-5ae1-4bbf-bc8d-956cbaf79d91', '6150c3480633a8b9179be17b850623cbe1e29cd42dadfd13a1d14fc90cb4685f', 'text-embedding-3-small', 'ai', 'small', NULL, 'pdf');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('f1079f12b6d3ce75f33c4a5fc1ea30de495d6a7d912f409d4a81a5f2544c5506', 'admin', '## MODULE 3: BACKUP CRITICAL LOAD SUB-PANEL CONFIGURATION', 'v1787143217662', '2026-08-19 12:40:50', '["backup-load-configuration","MODULE","BACKUP","LOAD","SUB","PANEL","important-note","code-technical"]', 'Code Technical', '🔍 Backup Load Configuration', NULL, '[]', '## MODULE 3: BACKUP CRITICAL LOAD SUB-PANEL CONFIGURATION', 8, 'high', '381b263d-5ae1-4bbf-bc8d-956cbaf79d91', '6bd11ff577cabc5829360da5dee6afc7f2db98902c1e91f30c9bb8c0a958b69b', 'text-embedding-3-small', 'ai', 'small', NULL, 'pdf');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('c08e8f58a209700f9584e89e84c97b6e8437ccce3874ecc9192804fbb156592f', 'admin', 'The Apex Smart Gateway 3 isolates the household from the NV Energy utility grid in <20 milliseconds during an outage (seamless UPS transition):
**Sub-Panel Circuit 1 (Kitchen Essentials):** 120V / 20A dedicated breaker for main kitchen refrigerator, freezer, and island countertop outlets.
**Sub-Panel Circuit 2 (Network & Security):** 120V / 15A dedicated breaker for fiber modem, mesh Wi-Fi routers, security cameras, and smart hub.
**Sub-Panel Circuit 3 (Master Suite & Medical):** 120V / 15A dedicated breaker for master bedroom lighting, ceiling fan, and CPAP / medical devices.', 'v1787143217662', '2026-08-19 12:40:50', '["backup-load-configuration","NV","UPS","CPAP","security","the-apex-smart-gateway","panel-circuit","code-technical"]', 'Code Technical', '🔍 Backup Load Configuration', NULL, '[]', 'The Apex Smart Gateway 3 isolates the household from the NV Energy utility grid in <20 milliseconds during an outage (seamless UPS transition):
**Sub-Panel Circuit 1 (Kitchen Essentials):** 120V / 20A', 9, 'high', '381b263d-5ae1-4bbf-bc8d-956cbaf79d91', 'fecff1fe05ea3a40d09d066fcb7d8133adebe417b5cbc46f7e2ff5939db436b5', 'text-embedding-3-small', 'ai', 'small', NULL, 'pdf');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('37111bfb964ebe158494e3d54991a58d8d35255cfc46b256fb7ed92ce59562f8', 'admin', '* * * * *

# APEX POWERVAULT 15KWH LFP — STORAGE SPECIFICATION & EMERGENCY SERVICE GUIDE

## MODULE 4: EMERGENCY MANUAL INVERTER BYPASS PROCEDURES (STEP-BY-STEP)', 'v1787143217662', '2026-08-19 12:40:50', '["backup-load-configuration","apex-powervault-15kwh-lfp-storage-specification-em","module-4-emergency-manual-inverter-bypass-procedur","APEX","LFP","GUIDE","MODULE","MANUAL"]', 'Code Technical', '🔍 Backup Load Configuration', NULL, '[]', '* * * * *

# APEX POWERVAULT 15KWH LFP — STORAGE SPECIFICATION & EMERGENCY SERVICE GUIDE

## MODULE 4: EMERGENCY MANUAL INVERTER BYPASS PROCEDURES (STEP-BY-STEP)', 10, 'high', '381b263d-5ae1-4bbf-bc8d-956cbaf79d91', 'af5686f059251565070a35d2c93edea17991122816ea0c0c4f30754e52e2e9c0', 'text-embedding-3-small', 'ai', 'small', NULL, 'pdf');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('b1c7878886f7559cb556b810a022daea5ce6cfa86e9a448703f1cabaf3cf42e0', 'admin', 'In the rare event of a Gateway communication freeze or inverter fault where the home loses power despite an active utility grid:
**Step 1 (Safety Verification):** Confirm that your neighborhood utility power is active and no downed power lines exist on your property.
**Step 2 (Locate Gateway Enclosure):** Open the external door of the Apex PowerVault Smart Gateway 3 mounted next to your main electrical meter.
**Step 3 (Disengage PV Main Breaker):** Flip the 40-amp double-pole breaker labeled "SOLAR/BATTERY MAIN" to the OFF position.
**Step 4 (Engage Manual Bypass Switch):** Grasp the red heavy-duty Manual Rotary Bypass switch located on the upper right panel and rotate it 90 degrees clockwise from "AUTO / SYSTEM" to "GRID BYPASS."
**Step 5 (Verify Power Restoration):** Verify that grid electricity flows directly from the NV Energy meter into the main distribution panel within 5 seconds.
**Step 6 (Notify Technical Support):** Call the Apex 24/7 Technical Support Hotline at (702) 555-APEX (2739) or submit an urgent ticket via the mobile app to dispatch an on-site technician.

## MODULE 5: BATTERY FIRMWARE UPDATES & GRID SERVICE MODES

**Over-The-Air (OTA) Updates:** Firmware updates deployed automatically between 2:00 AM and 4:00 AM PST via Wi-Fi/LTE.
**Mode 1 — Self-Consumption Maximization:** Battery charges from solar during peak production and discharges during evening peak hours (4:00 PM to 9:00 PM).
**Mode 2 — Time-Of-Use (TOU) Arbitrage:** Optimized for NV Energy optional TOU rates to avoid high on-peak summer rates.
**Mode 3 — Storm Watch / 100% Reserve Backup:** Automatically forces battery to 100% state of charge when National Weather Service issues high wind or flash flood warnings.

## MODULE 6: 15-YEAR BATTERY ENDURANCE WARRANTY & RECYCLING PROGRAM

**Warranty Period:** 15 Years or 6,000 equivalent full discharge cycles, maintaining at least 70% of initial 13.8 kWh usable capacity.
**End-of-Life Stewardship:** Apex provides 100% free certified battery de-installation and hydrometallurgical recycling through Redwood Materials in Carson City, NV.

## MODULE 7: BATTERY EXPANSION & PARALLEL STACKING PROTOCOLS

**Maximum Parallel Units:** Up to 4 PowerVault units can be paralleled on a single Smart Gateway (Total 60 kWh nominal / 55.2 kWh usable, 30.4 kW continuous).
**Communication Bus Cable:** Shielded twisted pair Cat6 RS-485 cable daisy-chained between units with 120-Ohm terminating resistor on end unit.

* * * * *

Apex Solar Solutions Inc. — Confidential & Proprietary Operational Manual Page 2 of 5
```

---

```markdown
APEX POWERVAULT 15KWH LFP — STORAGE SPECIFICATION & EMERGENCY SERVICE GUIDE

Clearance Distances: Maintain minimum 6 inches (150mm) horizontal spacing between adjacent battery enclosures for ventilation.

MODULE 8: DIAGNOSTIC ERROR CODES & FIELD RECOVERY

Fault Code E-101 (Over-Temperature): Internal temperature > 60°C. Fans engage at 100% speed; charging current automatically throttled by 50% until cooled.

Fault Code E-204 (Grid Frequency Deviation): Utility frequency outside 59.3 Hz - 60.5 Hz window. Gateway disconnects grid and runs in island mode.

Fault Code E-312 (BMS Communication Timeout): Inspect RJ45 internal ribbon cable; power cycle battery disconnect switch for 30 seconds.

Apex Solar Solutions Inc. — Confidential & Proprietary Operational Manual                      Page 3 of 5
```

```markdown
APEX POWERVAULT 15KWH LFP — STORAGE SPECIFICATION & EMERGENCY SERVICE GUIDE', 'v1787143217662', '2026-08-19 12:40:50', '["module-5-battery-firmware-updates-grid-service-mod","module-6-15-year-battery-endurance-warranty-recycl","module-7-battery-expansion-parallel-stacking-proto","PV","SOLAR","MAIN","OFF","AUTO"]', 'Code Technical', '📄 MODULE 5: BATTERY FIRMWARE UPDATES & GRID SERVICE MODES', ' 13.8', '[]', 'In the rare event of a Gateway communication freeze or inverter fault where the home loses power despite an active utility grid:
**Step 1 (Safety Verification):** Confirm that your neighborhood utilit', 11, 'high', '381b263d-5ae1-4bbf-bc8d-956cbaf79d91', '4e5b1ae79c90262d9039b1299d2971545d07147bd55ed587aa0907084571c6d0', 'text-embedding-3-small', 'ai', 'small', NULL, 'pdf');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('a392314c02ee19ac025fc00854c046ce7223a253055b58849a50d842854845af', 'admin', 'In the rare event of a Gateway communication freeze or inverter fault where the home loses power despite an active utility grid:
**Step 1 (Safety Verification):** Confirm that your neighborhood utility power is active and no downed power lines exist on your property.
**Step 2 (Locate Gateway Enclosure):** Open the external door of the Apex PowerVault Smart Gateway 3 mounted next to your main electrical meter.
**Step 3 (Disengage PV Main Breaker):** Flip the 40-amp double-pole breaker labeled "SOLAR/BATTERY MAIN" to the OFF position.
**Step 4 (Engage Manual Bypass Switch):** Grasp the red heavy-duty Manual Rotary Bypass switch located on the upper right panel and rotate it 90 degrees clockwise from "AUTO / SYSTEM" to "GRID BYPASS."
**Step 5 (Verify Power Restoration):** Verify that grid electricity flows directly from the NV Energy meter into the main distribution panel within 5 seconds.
**Step 6 (Notify Technical Support):** Call the Apex 24/7 Technical Support Hotline at (702) 555-APEX (2739) or submit an urgent ticket via the mobile app to dispatch an on-site technician.

## MODULE 5: BATTERY FIRMWARE UPDATES & GRID SERVICE MODES', 'v1787143217662', '2026-08-19 12:40:50', '["module-5-battery-firmware-updates-grid-service-mod","PV","SOLAR","MAIN","OFF","AUTO","SYSTEM","GRID"]', 'Code Technical', '📝 MODULE 5: BATTERY FIRMWARE UPDATES & GRID SERVICE MODES', NULL, '[]', 'In the rare event of a Gateway communication freeze or inverter fault where the home loses power despite an active utility grid:
**Step 1 (Safety Verification):** Confirm that your neighborhood utilit', 12, 'high', '381b263d-5ae1-4bbf-bc8d-956cbaf79d91', '9d8011188df3ec9e3b20ce97aafce7151f05b16211eb973af7727696d331b9cc', 'text-embedding-3-small', 'ai', 'small', NULL, 'pdf');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('7af23d1805cc0a88b5b607c25a0e93d1a6f6a1306ae1f8995154420642b55697', 'admin', 'In the rare event of a Gateway communication freeze or inverter fault where the home loses power despite an active utility grid:
**Step 1 (Safety Verification):** Confirm that your neighborhood utility power is active and no downed power lines exist on your property.
**Step 2 (Locate Gateway Enclosure):** Open the external door of the Apex PowerVault Smart Gateway 3 mounted next to your main electrical meter.
**Step 3 (Disengage PV Main Breaker):** Flip the 40-amp double-pole breaker labeled "SOLAR/BATTERY MAIN" to the OFF position.
**Step 4 (Engage Manual Bypass Switch):** Grasp the red heavy-duty Manual Rotary Bypass switch located on the upper right panel and rotate it 90 degrees clockwise from "AUTO / SYSTEM" to "GRID BYPASS."
**Step 5 (Verify Power Restoration):** Verify that grid electricity flows directly from the NV Energy meter into the main distribution panel within 5 seconds.
**Step 6 (Notify Technical Support):** Call the Apex 24/7 Technical Support Hotline at (702) 555-APEX (2739) or submit an urgent ticket via the mobile app to dispatch an on-site technician.', 'v1787143217662', '2026-08-19 12:40:50', '["emergency-power-restoration-steps","PV","SOLAR","MAIN","OFF","AUTO","SYSTEM","GRID"]', 'Code Technical', '🔍 Emergency Power Restoration Steps', NULL, '[]', 'In the rare event of a Gateway communication freeze or inverter fault where the home loses power despite an active utility grid:
**Step 1 (Safety Verification):** Confirm that your neighborhood utilit', 13, 'high', '381b263d-5ae1-4bbf-bc8d-956cbaf79d91', '07fc5e57543edc1de0d71b482e2498d1e351393c5323d2d002e3abdb49388cdf', 'text-embedding-3-small', 'ai', 'small', NULL, 'pdf');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('a1e0025ab5f7e1af3ff24d4bdfd34fffc92e413fe6d02eac043ab5e80a77caf0', 'admin', '## MODULE 5: BATTERY FIRMWARE UPDATES & GRID SERVICE MODES', 'v1787143217662', '2026-08-19 12:40:50', '["emergency-power-restoration-steps","MODULE","GRID","MODES","code-technical"]', 'Code Technical', '🔍 Emergency Power Restoration Steps', NULL, '[]', '## MODULE 5: BATTERY FIRMWARE UPDATES & GRID SERVICE MODES', 14, 'high', '381b263d-5ae1-4bbf-bc8d-956cbaf79d91', '6326e38138c8525cc7f368a544637820a34def42babf69a9f1cba6bc2bd2af0a', 'text-embedding-3-small', 'ai', 'small', NULL, 'pdf');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('5c307b4847c7cb72c1205769a7b357d79cdcced42e0096b2722349278e62bb80', 'admin', '**Over-The-Air (OTA) Updates:** Firmware updates deployed automatically between 2:00 AM and 4:00 AM PST via Wi-Fi/LTE.
**Mode 1 — Self-Consumption Maximization:** Battery charges from solar during peak production and discharges during evening peak hours (4:00 PM to 9:00 PM).
**Mode 2 — Time-Of-Use (TOU) Arbitrage:** Optimized for NV Energy optional TOU rates to avoid high on-peak summer rates.
**Mode 3 — Storm Watch / 100% Reserve Backup:** Automatically forces battery to 100% state of charge when National Weather Service issues high wind or flash flood warnings.

## MODULE 6: 15-YEAR BATTERY ENDURANCE WARRANTY & RECYCLING PROGRAM

**Warranty Period:** 15 Years or 6,000 equivalent full discharge cycles, maintaining at least 70% of initial 13.8 kWh usable capacity.
**End-of-Life Stewardship:** Apex provides 100% free certified battery de-installation and hydrometallurgical recycling through Redwood Materials in Carson City, NV.

## MODULE 7: BATTERY EXPANSION & PARALLEL STACKING PROTOCOLS

**Maximum Parallel Units:** Up to 4 PowerVault units can be paralleled on a single Smart Gateway (Total 60 kWh nominal / 55.2 kWh usable, 30.4 kW continuous).
**Communication Bus Cable:** Shielded twisted pair Cat6 RS-485 cable daisy-chained between units with 120-Ohm terminating resistor on end unit.

* * * * *', 'v1787143217662', '2026-08-19 12:40:50', '["module-6-15-year-battery-endurance-warranty-recycl","module-7-battery-expansion-parallel-stacking-proto","OTA","AM","PST","LTE","PM","TOU"]', 'Code Technical', '📝 MODULE 6: 15-YEAR BATTERY ENDURANCE WARRANTY & RECYCLING PROGRAM', ' 13.8', '[]', '**Over-The-Air (OTA) Updates:** Firmware updates deployed automatically between 2:00 AM and 4:00 AM PST via Wi-Fi/LTE', 15, 'high', '381b263d-5ae1-4bbf-bc8d-956cbaf79d91', 'dfcd39447c7384b98a575871b12766cb884e06ba0b8575348886fec98a4d0c7b', 'text-embedding-3-small', 'ai', 'small', NULL, 'pdf');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('bbe4e40ac64bec7fa4611a54d49d065a7b24ff543becd16bb07ea84d3a19862e', 'admin', '**Over-The-Air (OTA) Updates:** Firmware updates deployed automatically between 2:00 AM and 4:00 AM PST via Wi-Fi/LTE.
**Mode 1 — Self-Consumption Maximization:** Battery charges from solar during peak production and discharges during evening peak hours (4:00 PM to 9:00 PM).
**Mode 2 — Time-Of-Use (TOU) Arbitrage:** Optimized for NV Energy optional TOU rates to avoid high on-peak summer rates.
**Mode 3 — Storm Watch / 100% Reserve Backup:** Automatically forces battery to 100% state of charge when National Weather Service issues high wind or flash flood warnings.', 'v1787143217662', '2026-08-19 12:40:50', '["battery-firmware-update-procedures","OTA","AM","PST","LTE","PM","TOU","NV"]', 'Code Technical', '🔍 Battery Firmware Update Procedures', NULL, '[]', '**Over-The-Air (OTA) Updates:** Firmware updates deployed automatically between 2:00 AM and 4:00 AM PST via Wi-Fi/LTE', 16, 'high', '381b263d-5ae1-4bbf-bc8d-956cbaf79d91', 'd96387702ce994b9cbaf9c1c71c424cef6ea7a16d9cd46aca867b4c755b6741c', 'text-embedding-3-small', 'ai', 'small', NULL, 'pdf');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('6e78722a4ebd202f0ec5d8dbf754869010de2dafe35ba48b1f4ff4c1431bd224', 'admin', '## MODULE 6: 15-YEAR BATTERY ENDURANCE WARRANTY & RECYCLING PROGRAM

**Warranty Period:** 15 Years or 6,000 equivalent full discharge cycles, maintaining at least 70% of initial 13.8 kWh usable capacity.
**End-of-Life Stewardship:** Apex provides 100% free certified battery de-installation and hydrometallurgical recycling through Redwood Materials in Carson City, NV.

## MODULE 7: BATTERY EXPANSION & PARALLEL STACKING PROTOCOLS', 'v1787143217662', '2026-08-19 12:40:50', '["battery-firmware-update-procedures","module-7-battery-expansion-parallel-stacking-proto","MODULE","YEAR","NV","warranty-period","life-stewardship","code-technical"]', 'Code Technical', '🔍 Battery Firmware Update Procedures', ' 13.8', '[]', '## MODULE 6: 15-YEAR BATTERY ENDURANCE WARRANTY & RECYCLING PROGRAM

**Warranty Period:** 15 Years or 6,000 equivalent full discharge cycles, maintaining at least 70% of initial 13', 17, 'high', '381b263d-5ae1-4bbf-bc8d-956cbaf79d91', '67bee8f69de99386e1d9fac9cb3ca4e13fdf1a636454018c98871f912b30b478', 'text-embedding-3-small', 'ai', 'small', NULL, 'pdf');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('889626ea8f7b19aa6bb031f0a64da482f97135f440d9aebd70163dc668ffc7d8', 'admin', '**Maximum Parallel Units:** Up to 4 PowerVault units can be paralleled on a single Smart Gateway (Total 60 kWh nominal / 55.2 kWh usable, 30.4 kW continuous).
**Communication Bus Cable:** Shielded twisted pair Cat6 RS-485 cable daisy-chained between units with 120-Ohm terminating resistor on end unit.

* * * * *', 'v1787143217662', '2026-08-19 12:40:50', '["battery-firmware-update-procedures","RS","maximum-parallel-units","smart-gateway","code-technical","maximum parallel units","smart gateway","total"]', 'Code Technical', '🔍 Battery Firmware Update Procedures', '55.2', '[]', '**Maximum Parallel Units:** Up to 4 PowerVault units can be paralleled on a single Smart Gateway (Total 60 kWh nominal / 55', 18, 'high', '381b263d-5ae1-4bbf-bc8d-956cbaf79d91', '73de4ced4e6a74311dd7f8e80aca0ea71efaace4925f011d4915e75d814a6353', 'text-embedding-3-small', 'ai', 'small', NULL, 'pdf');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('800f937c7b791c90e03825e3d495f6559d295d2b632c7d1965bbb9d0b1930559', 'admin', 'Apex Solar Solutions Inc. — Confidential & Proprietary Operational Manual Page 2 of 5
```

---

```markdown
APEX POWERVAULT 15KWH LFP — STORAGE SPECIFICATION & EMERGENCY SERVICE GUIDE

Clearance Distances: Maintain minimum 6 inches (150mm) horizontal spacing between adjacent battery enclosures for ventilation.

MODULE 8: DIAGNOSTIC ERROR CODES & FIELD RECOVERY

Fault Code E-101 (Over-Temperature): Internal temperature > 60°C. Fans engage at 100% speed; charging current automatically throttled by 50% until cooled.

Fault Code E-204 (Grid Frequency Deviation): Utility frequency outside 59.3 Hz - 60.5 Hz window. Gateway disconnects grid and runs in island mode.

Fault Code E-312 (BMS Communication Timeout): Inspect RJ45 internal ribbon cable; power cycle battery disconnect switch for 30 seconds.

Apex Solar Solutions Inc. — Confidential & Proprietary Operational Manual                      Page 3 of 5
```

```markdown
APEX POWERVAULT 15KWH LFP — STORAGE SPECIFICATION & EMERGENCY SERVICE GUIDE', 'v1787143217662', '2026-08-19 12:40:50', '["APEX","LFP","GUIDE","MODULE","ERROR","CODES","FIELD","BMS"]', 'Code Technical', '📝 Medium Chunk', ' 59.3', '[]', 'Apex Solar Solutions Inc', 19, 'high', '381b263d-5ae1-4bbf-bc8d-956cbaf79d91', 'a56f37fa85558053225bfea7a907ed63e9c5e1cea5e5a9dd7c905f89319bbd9f', 'text-embedding-3-small', 'ai', 'small', NULL, 'pdf');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('de326de830bb9e02fef696e10c4042c652a73eafac20acf6ed3bf2d847cb3f65', 'admin', 'Apex Solar Solutions Inc. — Confidential & Proprietary Operational Manual Page 2 of 5
```

---

```markdown
APEX POWERVAULT 15KWH LFP — STORAGE SPECIFICATION & EMERGENCY SERVICE GUIDE

Clearance Distances: Maintain minimum 6 inches (150mm) horizontal spacing between adjacent battery enclosures for ventilation.

MODULE 8: DIAGNOSTIC ERROR CODES & FIELD RECOVERY

Fault Code E-101 (Over-Temperature): Internal temperature > 60°C.', 'v1787143217662', '2026-08-19 12:40:50', '["battery-warranty-and-recycling-program","APEX","LFP","GUIDE","MODULE","ERROR","CODES","FIELD"]', 'Code Technical', '🔍 Battery Warranty and Recycling Program', NULL, '[]', 'Apex Solar Solutions Inc', 20, 'high', '381b263d-5ae1-4bbf-bc8d-956cbaf79d91', '2c83e24a81cad5989ea8edaa508e1c243d4753ef06ea88c79bef21b293b9f897', 'text-embedding-3-small', 'ai', 'small', NULL, 'pdf');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('c690fe98cac8be068e5d3d37424155f975d51052e2053fb179a53e700b673962', 'admin', 'Fans engage at 100% speed; charging current automatically throttled by 50% until cooled.

Fault Code E-204 (Grid Frequency Deviation): Utility frequency outside 59.3 Hz - 60.5 Hz window.

Gateway disconnects grid and runs in island mode.

Fault Code E-312 (BMS Communication Timeout): Inspect RJ45 internal ribbon cable; power cycle battery disconnect switch for 30 seconds.', 'v1787143217662', '2026-08-19 12:40:50', '["battery-warranty-and-recycling-program","BMS","fault-code","grid-frequency-deviation","code-technical","contact-info","support","timeline"]', 'Code Technical', '🔍 Battery Warranty and Recycling Program', ' 59.3', '[]', 'Fans engage at 100% speed; charging current automatically throttled by 50% until cooled', 21, 'high', '381b263d-5ae1-4bbf-bc8d-956cbaf79d91', '3f496a35fada255df2b1763f442e4999219ed3251b9980e235347329e3073dae', 'text-embedding-3-small', 'ai', 'small', NULL, 'pdf');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('bc1a9e49bf002e9f904e285cd6695e5f6b06df8c1b4c97aacc907258479c9156', 'admin', 'Apex Solar Solutions Inc. — Confidential & Proprietary Operational Manual                      Page 3 of 5
```

```markdown
APEX POWERVAULT 15KWH LFP — STORAGE SPECIFICATION & EMERGENCY SERVICE GUIDE', 'v1787143217662', '2026-08-19 12:40:50', '["battery-warranty-and-recycling-program","APEX","LFP","GUIDE","apex-solar-solutions-inc","code-technical","how-to","tutorial"]', 'Code Technical', '🔍 Battery Warranty and Recycling Program', NULL, '[]', 'Apex Solar Solutions Inc', 22, 'high', '381b263d-5ae1-4bbf-bc8d-956cbaf79d91', '6cbd3b233ee9e21d8483e3cb205f9aae706ecb57ce5d69bc1a8c36af0f9f21ca', 'text-embedding-3-small', 'ai', 'small', NULL, 'pdf');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('69781ba61005e9717b5c36ceeef79d3b7403d8a99afc5a699d481a2de0f00483', 'admin', 'SUPPLEMENTAL APPENDIX — REGULATORY COMPLIANCE & VERIFICATION DATA

This appendix records archival state filings, calibration logs, and jurisdiction-specific regulatory code provisions.

Apex Solar Solutions Inc. — Confidential & Proprietary Operational Manual                      Page 4 of 5
```

---

```markdown
APEX POWERVAULT 15KWH LFP — STORAGE SPECIFICATION & EMERGENCY SERVICE GUIDE

SUPPLEMENTAL APPENDIX — REGULATORY COMPLIANCE & VERIFICATION DATA

This appendix records archival state filings, calibration logs, and jurisdiction-specific regulatory code provisions.

Apex Solar Solutions Inc. — Confidential & Proprietary Operational Manual                                                              Page 5 of 5
```', 'v1787143217662', '2026-08-19 12:40:50', '["DATA","APEX","LFP","GUIDE","apex-solar-solutions-inc","code-technical","how-to","tutorial"]', 'Code Technical', '📄 Large Chunk', NULL, '[]', 'SUPPLEMENTAL APPENDIX — REGULATORY COMPLIANCE & VERIFICATION DATA

This appendix records archival state filings, calibration logs, and jurisdiction-specific regulatory code provisions', 23, 'high', '381b263d-5ae1-4bbf-bc8d-956cbaf79d91', 'b6e150940aeeb6b73d7353375dea43a657374e476cee22a9e6e69c57ae519f58', 'text-embedding-3-small', 'ai', 'small', NULL, 'pdf');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('1ad37bca5a0a5896d2bba91f7362127f370d08943055b0afa95d4c1dc93bbc19', 'admin', 'SUPPLEMENTAL APPENDIX — REGULATORY COMPLIANCE & VERIFICATION DATA

This appendix records archival state filings, calibration logs, and jurisdiction-specific regulatory code provisions.

Apex Solar Solutions Inc. — Confidential & Proprietary Operational Manual                      Page 4 of 5
```

---

```markdown
APEX POWERVAULT 15KWH LFP — STORAGE SPECIFICATION & EMERGENCY SERVICE GUIDE

SUPPLEMENTAL APPENDIX — REGULATORY COMPLIANCE & VERIFICATION DATA

This appendix records archival state filings, calibration logs, and jurisdiction-specific regulatory code provisions.

Apex Solar Solutions Inc. — Confidential & Proprietary Operational Manual                                                              Page 5 of 5
```', 'v1787143217662', '2026-08-19 12:40:50', '["DATA","APEX","LFP","GUIDE","apex-solar-solutions-inc","code-technical","how-to","tutorial"]', 'Code Technical', '📝 Medium Chunk', NULL, '[]', 'SUPPLEMENTAL APPENDIX — REGULATORY COMPLIANCE & VERIFICATION DATA

This appendix records archival state filings, calibration logs, and jurisdiction-specific regulatory code provisions', 24, 'high', '381b263d-5ae1-4bbf-bc8d-956cbaf79d91', 'b6e150940aeeb6b73d7353375dea43a657374e476cee22a9e6e69c57ae519f58', 'text-embedding-3-small', 'ai', 'small', NULL, 'pdf');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('e6460a0ffc7fa4fd6f19b0347d1bd62e91890302594ef369577234e0ca5b7734', 'admin', 'SUPPLEMENTAL APPENDIX — REGULATORY COMPLIANCE & VERIFICATION DATA

This appendix records archival state filings, calibration logs, and jurisdiction-specific regulatory code provisions.

Apex Solar Solutions Inc. — Confidential & Proprietary Operational Manual                      Page 4 of 5
```

---

```markdown
APEX POWERVAULT 15KWH LFP — STORAGE SPECIFICATION & EMERGENCY SERVICE GUIDE', 'v1787143217662', '2026-08-19 12:40:50', '["regulatory-compliance-overview","DATA","APEX","LFP","GUIDE","apex-solar-solutions-inc","code-technical","how-to"]', 'Code Technical', '🔍 Regulatory Compliance Overview', NULL, '[]', 'SUPPLEMENTAL APPENDIX — REGULATORY COMPLIANCE & VERIFICATION DATA

This appendix records archival state filings, calibration logs, and jurisdiction-specific regulatory code provisions', 25, 'high', '381b263d-5ae1-4bbf-bc8d-956cbaf79d91', '28d9476161701266af047555640bf959a723b352a49709f645ef9d72fc641cca', 'text-embedding-3-small', 'ai', 'small', NULL, 'pdf');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('e42603b3ee7c9e5d0005fe2755abe9e00b320aff792c4d323aff8ae044aeafe7', 'admin', 'SUPPLEMENTAL APPENDIX — REGULATORY COMPLIANCE & VERIFICATION DATA

This appendix records archival state filings, calibration logs, and jurisdiction-specific regulatory code provisions.

Apex Solar Solutions Inc. — Confidential & Proprietary Operational Manual                                                              Page 5 of 5
```', 'v1787143217662', '2026-08-19 12:40:50', '["regulatory-compliance-overview","DATA","apex-solar-solutions-inc","code-technical","legal","compliance","jurisdiction-specific","apex solar solutions inc"]', 'Code Technical', '🔍 Regulatory Compliance Overview', NULL, '[]', 'SUPPLEMENTAL APPENDIX — REGULATORY COMPLIANCE & VERIFICATION DATA

This appendix records archival state filings, calibration logs, and jurisdiction-specific regulatory code provisions', 26, 'high', '381b263d-5ae1-4bbf-bc8d-956cbaf79d91', 'e916cd157cb376bfd5737ea38784dc6ef0242fc825c9066d6cea6b3d018b9a7d', 'text-embedding-3-small', 'ai', 'small', NULL, 'pdf');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('e971d413d7cd927f8798c8139d478598b0953f29e1cbe7bd2e736457f3da88b8', 'admin', '```markdown
# APEX ULTRAVOLT-X PRO 450W — COMPLETE ENGINEERING & INSTALLATION MANUAL

Photovoltaic Module Datasheet, Degradation Profiles, Inverter Rapid Shutdown & Warehouse Directory

## SECTION 1: PHOTOVOLTAIC ELECTRICAL SPECIFICATIONS (MODEL: AUV-450-TOP)

**Nominal Maximum Power (Pmax STC):** 450 Watts (Standard Test Conditions: Irradiance 1000 W/m2, Cell Temp 25°C, Air Mass AM1.5).
**Power Tolerance Range:** 0 to +5 Watts (Positive sorting only for maximum output consistency).
**Module Conversion Efficiency:** 22.8% (Aperture area efficiency: 23.2%).
**Open-Circuit Voltage (Voc):** 41.68 Volts (Temperature coefficient: -0.24%/°C).
**Short-Circuit Current (Isc):** 13.82 Amperes (Temperature coefficient: +0.045%/°C).
**Maximum Power Voltage (Vmp):** 34.92 Volts.
**Maximum Power Current (Imp):** 12.89 Amperes.
**Nominal Module Operating Temp (NMOT):** 42°C ± 2°C.
**Power Output at NMOT (Pmax):** 341.2 Watts (Irradiance 800 W/m2, Ambient Temp 20°C, Wind Speed 1 m/s).
**Temperature Coefficient of Pmax:** -0.29% per degree Celsius (Industry-leading heat degradation resilience in Nevada desert).
**Maximum System Voltage:** 1500 Volts DC (IEC / UL certified).
**Maximum Series Fuse Rating:** 25 Amperes.

## SECTION 2: MECHANICAL SPECIFICATIONS, MATERIALS & CELL ARCHITECTURE

**Cell Matrix Configuration:** 108 Half-Cut Monocrystalline N-Type TOPCon cells (6 x 18 matrix arrangement).
**Cell Dimensions:** 182mm x 91mm (M10 wafer format with 16 multi-busbar technology).
**Module Dimensions (L x W x H):** 1722mm x 1134mm x 30mm (67.8 in x 44.6 in x 1.18 in).
**Total Module Weight:** 21.5 kg (47.4 lbs).
**Front Glass Construction:** 3.2mm high-transmission, anti-reflective, low-iron tempered solar glass.
**Frame Alloy:** Anodized aluminum alloy (6063-T6) with black electrophoretic coating.
**Junction Box Rating:** IP68 rated with 3 integrated Schottky bypass diodes.
**Output Cables:** 4.0 mm2 (12 AWG) cross-section, length: 1200mm (+) and 1200mm (-).
**Connectors:** Stäubli MC4-Evo2 original connectors (1500V DC rated).
**Static Mechanical Load (Snow):** 5400 Pascals (112.8 lbs/sq.ft) positive load.
**Static Mechanical Load (Wind):** 2400 Pascals (50.15 lbs/sq.ft) negative uplift load.
**Hailstone Impact Resistance:** Class 4 rated (25mm ice sphere at 23 m/s velocity).

## SECTION 3: INVERTER PAIRING, STRING SIZING & RAPID SHUTDOWN

**Approved Microinverter Model:** Enphase IQ8+ (IQ8PLUS-72-2-US) with Q-Cable bus. Max continuous AC output: 300 VA. Peak output: 320 VA. Grid code compliant with Rule 21 & IEEE 1547-2018.
**Approved String Inverter Model:** SolarEdge Home Hub Inverter (SE7600H-US / SE10000H-US) paired with SolarEdge S500B Power Optimizers.

---

# APEX ULTRAVOLT-X PRO 450W — COMPLETE ENGINEERING & INSTALLATION MANUAL

**String Sizing Guidelines (SolarEdge):** Minimum string length: 8 modules; Maximum string length: 25 modules; Max continuous DC power per string: 5700W.
**Rapid Shutdown Compliance:** Integrated Module-Level Rapid Shutdown (MLRSD) certified under UL 1741 and NEC 2020/2023 Section 690.12 (reduces voltage to < 30V within 30 seconds of grid drop).
**Grounding Lug Installation:** WEEB 9.5 grounding clips or Ilsco GBL-4DBT copper grounding lugs torqued to 35 in-lbs on specified grounding holes.

## SECTION 4: 30-YEAR LINEAR PERFORMANCE WARRANTY & DEGRADATION DATA', 'v1787143279288', '2026-08-19 12:41:54', '["apex-ultravolt-x-pro-450w-complete-engineering-ins","section-1-photovoltaic-electrical-specifications-m","section-2-mechanical-specifications-materials-cell","section-3-inverter-pairing-string-sizing-rapid-shu","section-4-30-year-linear-performance-warranty-degr","41.68","13.82","34.92"]', 'Medical Scientific', '📄 APEX ULTRAVOLT-X PRO 450W — COMPLETE ENGINEERING & INSTALLATION MANUAL', '22.8', '[]', '```markdown
# APEX ULTRAVOLT-X PRO 450W — COMPLETE ENGINEERING & INSTALLATION MANUAL

Photovoltaic Module Datasheet, Degradation Profiles, Inverter Rapid Shutdown & Warehouse Directory

## SECTION 1: ', 0, 'high', '2636d383-86d4-445f-8334-e8fc8319d5e6', 'd36b1b560f3a58d1462cd17ebc9c5f51019fa27cb59186080b27b7cbd70c92fc', 'text-embedding-3-small', 'ai', 'small', NULL, 'pdf');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('8cb8279168d1a16b552643793bb9407c13f6af5f857b5f53a89aa5fef006b0fa', 'admin', '```markdown
# APEX ULTRAVOLT-X PRO 450W — COMPLETE ENGINEERING & INSTALLATION MANUAL

Photovoltaic Module Datasheet, Degradation Profiles, Inverter Rapid Shutdown & Warehouse Directory

## SECTION 1: PHOTOVOLTAIC ELECTRICAL SPECIFICATIONS (MODEL: AUV-450-TOP)

**Nominal Maximum Power (Pmax STC):** 450 Watts (Standard Test Conditions: Irradiance 1000 W/m2, Cell Temp 25°C, Air Mass AM1.5).
**Power Tolerance Range:** 0 to +5 Watts (Positive sorting only for maximum output consistency).
**Module Conversion Efficiency:** 22.8% (Aperture area efficiency: 23.2%).
**Open-Circuit Voltage (Voc):** 41.68 Volts (Temperature coefficient: -0.24%/°C).
**Short-Circuit Current (Isc):** 13.82 Amperes (Temperature coefficient: +0.045%/°C).
**Maximum Power Voltage (Vmp):** 34.92 Volts.
**Maximum Power Current (Imp):** 12.89 Amperes.
**Nominal Module Operating Temp (NMOT):** 42°C ± 2°C.
**Power Output at NMOT (Pmax):** 341.2 Watts (Irradiance 800 W/m2, Ambient Temp 20°C, Wind Speed 1 m/s).
**Temperature Coefficient of Pmax:** -0.29% per degree Celsius (Industry-leading heat degradation resilience in Nevada desert).
**Maximum System Voltage:** 1500 Volts DC (IEC / UL certified).
**Maximum Series Fuse Rating:** 25 Amperes.

## SECTION 2: MECHANICAL SPECIFICATIONS, MATERIALS & CELL ARCHITECTURE', 'v1787143279288', '2026-08-19 12:41:54', '["apex-ultravolt-x-pro-450w-complete-engineering-ins","section-1-photovoltaic-electrical-specifications-m","section-2-mechanical-specifications-materials-cell","41.68","13.82","34.92","12.89","APEX"]', 'Medical Scientific', '📝 APEX ULTRAVOLT-X PRO 450W — COMPLETE ENGINEERING & INSTALLATION MANUAL', '22.8', '[]', '```markdown
# APEX ULTRAVOLT-X PRO 450W — COMPLETE ENGINEERING & INSTALLATION MANUAL

Photovoltaic Module Datasheet, Degradation Profiles, Inverter Rapid Shutdown & Warehouse Directory

## SECTION 1: ', 1, 'high', '2636d383-86d4-445f-8334-e8fc8319d5e6', '2c53c77020730eb536ba144ea0265a0d74e69ea6c3ae30e017743f9bae7c3aba', 'text-embedding-3-small', 'ai', 'small', NULL, 'pdf');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('e2f6548f0927a57f7a576941b3b440653e7df0e354456f6169ea2f103d84be73', 'admin', '```markdown
# APEX ULTRAVOLT-X PRO 450W — COMPLETE ENGINEERING & INSTALLATION MANUAL

Photovoltaic Module Datasheet, Degradation Profiles, Inverter Rapid Shutdown & Warehouse Directory

## SECTION 1: PHOTOVOLTAIC ELECTRICAL SPECIFICATIONS (MODEL: AUV-450-TOP)', 'v1787143279288', '2026-08-19 12:41:54', '["photovoltaic-electrical-specifications","apex-ultravolt-x-pro-450w-complete-engineering-ins","section-1-photovoltaic-electrical-specifications-m","APEX","PRO","MANUAL","MODEL","AUV"]', 'Medical Scientific', '🔍 Photovoltaic Electrical Specifications', NULL, '[]', '```markdown
# APEX ULTRAVOLT-X PRO 450W — COMPLETE ENGINEERING & INSTALLATION MANUAL

Photovoltaic Module Datasheet, Degradation Profiles, Inverter Rapid Shutdown & Warehouse Directory

## SECTION 1: ', 2, 'high', '2636d383-86d4-445f-8334-e8fc8319d5e6', '5d3cd4873be0686843a3532004110b9c7e891ab4fba7f5660bc4399a9b436881', 'text-embedding-3-small', 'ai', 'small', NULL, 'pdf');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('cc807cfaa981c363e37f8775bc34c79c4f5c23743a299b6e8e98cbf742f4892a', 'admin', '**Nominal Maximum Power (Pmax STC):** 450 Watts (Standard Test Conditions: Irradiance 1000 W/m2, Cell Temp 25°C, Air Mass AM1.5).
**Power Tolerance Range:** 0 to +5 Watts (Positive sorting only for maximum output consistency).
**Module Conversion Efficiency:** 22.8% (Aperture area efficiency: 23.2%).
**Open-Circuit Voltage (Voc):** 41.68 Volts (Temperature coefficient: -0.24%/°C).
**Short-Circuit Current (Isc):** 13.82 Amperes (Temperature coefficient: +0.045%/°C).
**Maximum Power Voltage (Vmp):** 34.92 Volts.
**Maximum Power Current (Imp):** 12.89 Amperes.
**Nominal Module Operating Temp (NMOT):** 42°C ± 2°C.
**Power Output at NMOT (Pmax):** 341.2 Watts (Irradiance 800 W/m2, Ambient Temp 20°C, Wind Speed 1 m/s).
**Temperature Coefficient of Pmax:** -0.29% per degree Celsius (Industry-leading heat degradation resilience in Nevada desert).
**Maximum System Voltage:** 1500 Volts DC (IEC / UL certified).
**Maximum Series Fuse Rating:** 25 Amperes.', 'v1787143279288', '2026-08-19 12:41:54', '["photovoltaic-electrical-specifications","41.68","13.82","34.92","12.89","STC","NMOT","DC"]', 'Medical Scientific', '🔍 Photovoltaic Electrical Specifications', '22.8', '[]', '**Nominal Maximum Power (Pmax STC):** 450 Watts (Standard Test Conditions: Irradiance 1000 W/m2, Cell Temp 25°C, Air Mass AM1', 3, 'high', '2636d383-86d4-445f-8334-e8fc8319d5e6', '55bb0513f03d81ad4bb644721058dfd69eb4a34cd1b97c1fb7a76f56754d379c', 'text-embedding-3-small', 'ai', 'small', NULL, 'pdf');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('2b668d11f934cbef105c6c9fe19eb41ca93aefd840b28727ed7377dc486e4467', 'admin', '## SECTION 2: MECHANICAL SPECIFICATIONS, MATERIALS & CELL ARCHITECTURE', 'v1787143279288', '2026-08-19 12:41:54', '["photovoltaic-electrical-specifications","CELL","medical-scientific"]', 'Medical Scientific', '🔍 Photovoltaic Electrical Specifications', NULL, '[]', '## SECTION 2: MECHANICAL SPECIFICATIONS, MATERIALS & CELL ARCHITECTURE', 4, 'high', '2636d383-86d4-445f-8334-e8fc8319d5e6', '20cb268f4dd15148fb42e9a4cf7382ec18c90eb9a3697824a1ec4caab05bcc0e', 'text-embedding-3-small', 'ai', 'small', NULL, 'pdf');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('1798600442792678e8a2efc079ea931574a40f99710731faab18b22ff1b13aa6', 'admin', '**Cell Matrix Configuration:** 108 Half-Cut Monocrystalline N-Type TOPCon cells (6 x 18 matrix arrangement).
**Cell Dimensions:** 182mm x 91mm (M10 wafer format with 16 multi-busbar technology).
**Module Dimensions (L x W x H):** 1722mm x 1134mm x 30mm (67.8 in x 44.6 in x 1.18 in).
**Total Module Weight:** 21.5 kg (47.4 lbs).
**Front Glass Construction:** 3.2mm high-transmission, anti-reflective, low-iron tempered solar glass.
**Frame Alloy:** Anodized aluminum alloy (6063-T6) with black electrophoretic coating.
**Junction Box Rating:** IP68 rated with 3 integrated Schottky bypass diodes.
**Output Cables:** 4.0 mm2 (12 AWG) cross-section, length: 1200mm (+) and 1200mm (-).
**Connectors:** Stäubli MC4-Evo2 original connectors (1500V DC rated).
**Static Mechanical Load (Snow):** 5400 Pascals (112.8 lbs/sq.ft) positive load.
**Static Mechanical Load (Wind):** 2400 Pascals (50.15 lbs/sq.ft) negative uplift load.
**Hailstone Impact Resistance:** Class 4 rated (25mm ice sphere at 23 m/s velocity).

## SECTION 3: INVERTER PAIRING, STRING SIZING & RAPID SHUTDOWN

**Approved Microinverter Model:** Enphase IQ8+ (IQ8PLUS-72-2-US) with Q-Cable bus. Max continuous AC output: 300 VA. Peak output: 320 VA. Grid code compliant with Rule 21 & IEEE 1547-2018.
**Approved String Inverter Model:** SolarEdge Home Hub Inverter (SE7600H-US / SE10000H-US) paired with SolarEdge S500B Power Optimizers.', 'v1787143279288', '2026-08-19 12:41:54', '["section-3-inverter-pairing-string-sizing-rapid-shu","50.15","AWG","DC","STRING","SIZING","RAPID","US"]', 'Medical Scientific', '📝 SECTION 3: INVERTER PAIRING, STRING SIZING & RAPID SHUTDOWN', '67.8', '[]', '**Cell Matrix Configuration:** 108 Half-Cut Monocrystalline N-Type TOPCon cells (6 x 18 matrix arrangement)', 5, 'high', '2636d383-86d4-445f-8334-e8fc8319d5e6', '700ab5ba24b38de1a461a42d71b5007dfb2656dd6871f85137c8544346126de9', 'text-embedding-3-small', 'ai', 'small', NULL, 'pdf');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('3a51e01f50fa8b0189e9ebde8b85324f87f864ead05b593bfe22935446eebba1', 'admin', '**Cell Matrix Configuration:** 108 Half-Cut Monocrystalline N-Type TOPCon cells (6 x 18 matrix arrangement).
**Cell Dimensions:** 182mm x 91mm (M10 wafer format with 16 multi-busbar technology).
**Module Dimensions (L x W x H):** 1722mm x 1134mm x 30mm (67.8 in x 44.6 in x 1.18 in).
**Total Module Weight:** 21.5 kg (47.4 lbs).
**Front Glass Construction:** 3.2mm high-transmission, anti-reflective, low-iron tempered solar glass.
**Frame Alloy:** Anodized aluminum alloy (6063-T6) with black electrophoretic coating.
**Junction Box Rating:** IP68 rated with 3 integrated Schottky bypass diodes.
**Output Cables:** 4.0 mm2 (12 AWG) cross-section, length: 1200mm (+) and 1200mm (-).
**Connectors:** Stäubli MC4-Evo2 original connectors (1500V DC rated).
**Static Mechanical Load (Snow):** 5400 Pascals (112.8 lbs/sq.ft) positive load.
**Static Mechanical Load (Wind):** 2400 Pascals (50.15 lbs/sq.ft) negative uplift load.
**Hailstone Impact Resistance:** Class 4 rated (25mm ice sphere at 23 m/s velocity).', 'v1787143279288', '2026-08-19 12:41:54', '["mechanical-specifications-and-materials","50.15","AWG","DC","cell-matrix-configuration","cut-monocrystalline","medical-scientific","timeline"]', 'Medical Scientific', '🔍 Mechanical Specifications and Materials', '67.8', '[]', '**Cell Matrix Configuration:** 108 Half-Cut Monocrystalline N-Type TOPCon cells (6 x 18 matrix arrangement)', 6, 'high', '2636d383-86d4-445f-8334-e8fc8319d5e6', '86f9a36c951ecbe89c043a44e0997b4b058559438a130eb6767aac03490c9a45', 'text-embedding-3-small', 'ai', 'small', NULL, 'pdf');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('5570d2e65759f7b8a85fc316f17a8ee2530c23bf6e5c5156d3f75e144ab4366f', 'admin', '## SECTION 3: INVERTER PAIRING, STRING SIZING & RAPID SHUTDOWN

**Approved Microinverter Model:** Enphase IQ8+ (IQ8PLUS-72-2-US) with Q-Cable bus.

Max continuous AC output: 300 VA.

Peak output: 320 VA.

Grid code compliant with Rule 21 & IEEE 1547-2018.
**Approved String Inverter Model:** SolarEdge Home Hub Inverter (SE7600H-US / SE10000H-US) paired with SolarEdge S500B Power Optimizers.', 'v1787143279288', '2026-08-19 12:41:54', '["mechanical-specifications-and-materials","STRING","SIZING","RAPID","US","AC","VA","IEEE"]', 'Medical Scientific', '🔍 Mechanical Specifications and Materials', NULL, '[]', '## SECTION 3: INVERTER PAIRING, STRING SIZING & RAPID SHUTDOWN

**Approved Microinverter Model:** Enphase IQ8+ (IQ8PLUS-72-2-US) with Q-Cable bus', 7, 'high', '2636d383-86d4-445f-8334-e8fc8319d5e6', '82c15d42fd037c4fd70108c50144d9c42d231c058a10364d925e31f9fd4e5f0f', 'text-embedding-3-small', 'ai', 'small', NULL, 'pdf');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('08ee9c27aec801492c759451d3e4bdcf9c45d7ea07a1eb720c93abed79b6f48a', 'admin', '---

# APEX ULTRAVOLT-X PRO 450W — COMPLETE ENGINEERING & INSTALLATION MANUAL

**String Sizing Guidelines (SolarEdge):** Minimum string length: 8 modules; Maximum string length: 25 modules; Max continuous DC power per string: 5700W.
**Rapid Shutdown Compliance:** Integrated Module-Level Rapid Shutdown (MLRSD) certified under UL 1741 and NEC 2020/2023 Section 690.12 (reduces voltage to < 30V within 30 seconds of grid drop).
**Grounding Lug Installation:** WEEB 9.5 grounding clips or Ilsco GBL-4DBT copper grounding lugs torqued to 35 in-lbs on specified grounding holes.

## SECTION 4: 30-YEAR LINEAR PERFORMANCE WARRANTY & DEGRADATION DATA', 'v1787143279288', '2026-08-19 12:41:54', '["apex-ultravolt-x-pro-450w-complete-engineering-ins","section-4-30-year-linear-performance-warranty-degr","690.12","APEX","PRO","MANUAL","DC","MLRSD"]', 'Medical Scientific', '📝 APEX ULTRAVOLT-X PRO 450W — COMPLETE ENGINEERING & INSTALLATION MANUAL', 'SECTION 690.12', '[]', '---

# APEX ULTRAVOLT-X PRO 450W — COMPLETE ENGINEERING & INSTALLATION MANUAL

**String Sizing Guidelines (SolarEdge):** Minimum string length: 8 modules; Maximum string length: 25 modules; Max contin', 8, 'high', '2636d383-86d4-445f-8334-e8fc8319d5e6', '839f58b3d09672172df9cbe67169674812613285efb60a7dd40ef929bca0d1a1', 'text-embedding-3-small', 'ai', 'small', NULL, 'pdf');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('900657bf3c928bb9ba28fb2f13f6aa02f395dad76147d8c4c862c78bd7188771', 'admin', '---

# APEX ULTRAVOLT-X PRO 450W — COMPLETE ENGINEERING & INSTALLATION MANUAL', 'v1787143279288', '2026-08-19 12:41:54', '["inverter-pairing-and-string-sizing","apex-ultravolt-x-pro-450w-complete-engineering-ins","APEX","PRO","MANUAL","medical-scientific"]', 'Medical Scientific', '🔍 Inverter Pairing and String Sizing', NULL, '[]', '---

# APEX ULTRAVOLT-X PRO 450W — COMPLETE ENGINEERING & INSTALLATION MANUAL', 9, 'high', '2636d383-86d4-445f-8334-e8fc8319d5e6', '29b8421f5494c82fc5961300bb54f1eb554c4e0ab50a939ff0c49a0eb152cd0c', 'text-embedding-3-small', 'ai', 'small', NULL, 'pdf');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('a038d7687e22332d97d7a6bdf69230bb2edfe8fec966b5a28ebaf2467d35706c', 'admin', '**String Sizing Guidelines (SolarEdge):** Minimum string length: 8 modules; Maximum string length: 25 modules; Max continuous DC power per string: 5700W.
**Rapid Shutdown Compliance:** Integrated Module-Level Rapid Shutdown (MLRSD) certified under UL 1741 and NEC 2020/2023 Section 690.12 (reduces voltage to < 30V within 30 seconds of grid drop).
**Grounding Lug Installation:** WEEB 9.5 grounding clips or Ilsco GBL-4DBT copper grounding lugs torqued to 35 in-lbs on specified grounding holes.', 'v1787143279288', '2026-08-19 12:41:54', '["inverter-pairing-and-string-sizing","690.12","DC","MLRSD","UL","NEC","WEEB","GBL"]', 'Medical Scientific', '🔍 Inverter Pairing and String Sizing', 'SECTION 690.12', '[]', '**String Sizing Guidelines (SolarEdge):** Minimum string length: 8 modules; Maximum string length: 25 modules; Max continuous DC power per string: 5700W', 10, 'high', '2636d383-86d4-445f-8334-e8fc8319d5e6', '3f0892fd2c6b0ad8bc15cf189ee291a1b10cb0b4493fc3a75a1f6cb29086a1fc', 'text-embedding-3-small', 'ai', 'small', NULL, 'pdf');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('efac786f366c69dd8859e8ffd9e9dfaa99d57dc2efacf00a5d3a58fdd13ea00c', 'admin', '## SECTION 4: 30-YEAR LINEAR PERFORMANCE WARRANTY & DEGRADATION DATA', 'v1787143279288', '2026-08-19 12:41:54', '["inverter-pairing-and-string-sizing","YEAR","LINEAR","DATA","medical-scientific"]', 'Medical Scientific', '🔍 Inverter Pairing and String Sizing', NULL, '[]', '## SECTION 4: 30-YEAR LINEAR PERFORMANCE WARRANTY & DEGRADATION DATA', 11, 'high', '2636d383-86d4-445f-8334-e8fc8319d5e6', '53129e7a506a9a7091a9f633162c572df5ec8fd163fcda369e69cba6556a1cb0', 'text-embedding-3-small', 'ai', 'small', NULL, 'pdf');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('d6d6f8af53ad529ad206c6d8a67dafbfd855710ebc0ba1e05e1d169646c952a7', 'admin', '**Year 1 Guaranteed Output:** 99.0% of nominal rated peak power output.
**Annual Degradation Rate (Years 2-30):** Maximum 0.35% linear annual degradation.
**Year 10 Guaranteed Output:** 95.8% of nominal rated peak power output.
**Year 20 Guaranteed Output:** 92.35% of nominal rated peak power output.
**Year 25 Guaranteed Output:** 90.60% of nominal rated peak power output.
**Year 30 Guaranteed Output:** 88.85% of nominal rated peak power output.

## SECTION 5: REGIONAL WAREHOUSE LOGISTICS & LEGACY 2024 NOTICES

**Regional Equipment Warehouse (Parts Pickup Only):** 3200 Polaris Ave, Suite 12, Las Vegas, NV 89102 (Note: This is an industrial logistics warehouse for certified contractors only, NOT a customer service office).
**Legacy 2024 Technical Manual Clause:** Outdated 2024 revision mentions a $250 RMA restocking fee for return of undamaged modules (This technical clause is completely superseded by the 2026 Corporate Policy of $150 flat permit fee).

## SECTION 6: CLEANING, THERMAL CARE & DUST MITIGATION PROTOCOLS

**Cleaning Water Specification:** Deionized reverse-osmosis water with Total Dissolved Solids (TDS) under 20 ppm.
**Cleaning Tool Standards:** Microfiber telescopic water-fed poles with soft natural bristles; no rotary pressure washers.
**Thermal Shock Warning:** Never apply cold water to panels when ambient temperature exceeds 95°F or during direct sunlight.

## SECTION 7: MOUNTING TORQUE & CLAMPING SPECIFICATIONS

**Mid-Clamp Torque:** 11.5 N·m to 14.0 N·m (8.5 to 10.3 ft-lbs) using M8 stainless steel hardware.
**End-Clamp Torque:** 13.0 N·m to 15.5 N·m (9.6 to 11.4 ft-lbs) with universal black anodized end stops.
**Rail Spanning Limits:** Maximum unsupported rail cantilever. 18 inches (457mm) on standard asphalt shingle.

## SECTION 8: ELECTRICAL TEST & COMMISSIONING VERIFICATION

**Open Circuit Voltage Test:** Measure Voc on every series string prior to inverter connection (must be within ±5% of calculated STC string voltage).
**Insulation Resistance Test (Megger):** Test positive and negative conductors to ground at 1000V DC (minimum reading > 50 M-Ohms required).
```

---

```markdown
APEX ULTRAVOLT-X PRO 450W — COMPLETE ENGINEERING & INSTALLATION MANUAL

SUPPLEMENTAL APPENDIX — REGULATORY COMPLIANCE & VERIFICATION DATA

This appendix records archival state filings, calibration logs, and jurisdiction-specific regulatory code provisions.

Apex Solar Solutions Inc. — Confidential & Proprietary Operational Manual                                            Page 3 of 5
```

```markdown
APEX ULTRAVOLT-X PRO 450W — COMPLETE ENGINEERING & INSTALLATION MANUAL

SUPPLEMENTAL APPENDIX — REGULATORY COMPLIANCE & VERIFICATION DATA

This appendix records archival state filings, calibration logs, and jurisdiction-specific regulatory code provisions.

Apex Solar Solutions Inc. — Confidential & Proprietary Operational Manual                                            Page 4 of 5
```

---

```markdown
APEX ULTRAVOLT-X PRO 450W — COMPLETE ENGINEERING & INSTALLATION MANUAL

SUPPLEMENTAL APPENDIX — REGULATORY COMPLIANCE & VERIFICATION DATA

This appendix records archival state filings, calibration logs, and jurisdiction-specific regulatory code provisions.

Apex Solar Solutions Inc. — Confidential & Proprietary Operational Manual                           Page 5 of 5
```', 'v1787143279288', '2026-08-19 12:41:54', '["section-5-regional-warehouse-logistics-legacy-2024","section-6-cleaning-thermal-care-dust-mitigation-pr","section-7-mounting-torque-clamping-specifications","section-8-electrical-test-commissioning-verificati","92.35","90.60","88.85","LEGACY"]', 'Medical Scientific', '📄 SECTION 5: REGIONAL WAREHOUSE LOGISTICS & LEGACY 2024 NOTICES', '99.0', '[]', '**Year 1 Guaranteed Output:** 99', 12, 'high', '2636d383-86d4-445f-8334-e8fc8319d5e6', 'e7e4bf495bdabf9e533b02794630e725d1901140525de240540f2c4c214b08a7', 'text-embedding-3-small', 'ai', 'small', NULL, 'pdf');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('78e97fa5cdcd50b216b83a711d68030b19794da1a720f2eafa00af57df853512', 'admin', '**Year 1 Guaranteed Output:** 99.0% of nominal rated peak power output.
**Annual Degradation Rate (Years 2-30):** Maximum 0.35% linear annual degradation.
**Year 10 Guaranteed Output:** 95.8% of nominal rated peak power output.
**Year 20 Guaranteed Output:** 92.35% of nominal rated peak power output.
**Year 25 Guaranteed Output:** 90.60% of nominal rated peak power output.
**Year 30 Guaranteed Output:** 88.85% of nominal rated peak power output.

## SECTION 5: REGIONAL WAREHOUSE LOGISTICS & LEGACY 2024 NOTICES

**Regional Equipment Warehouse (Parts Pickup Only):** 3200 Polaris Ave, Suite 12, Las Vegas, NV 89102 (Note: This is an industrial logistics warehouse for certified contractors only, NOT a customer service office).
**Legacy 2024 Technical Manual Clause:** Outdated 2024 revision mentions a $250 RMA restocking fee for return of undamaged modules (This technical clause is completely superseded by the 2026 Corporate Policy of $150 flat permit fee).

## SECTION 6: CLEANING, THERMAL CARE & DUST MITIGATION PROTOCOLS

**Cleaning Water Specification:** Deionized reverse-osmosis water with Total Dissolved Solids (TDS) under 20 ppm.
**Cleaning Tool Standards:** Microfiber telescopic water-fed poles with soft natural bristles; no rotary pressure washers.
**Thermal Shock Warning:** Never apply cold water to panels when ambient temperature exceeds 95°F or during direct sunlight.', 'v1787143279288', '2026-08-19 12:41:54', '["section-5-regional-warehouse-logistics-legacy-2024","section-6-cleaning-thermal-care-dust-mitigation-pr","92.35","90.60","88.85","LEGACY","NV","RMA"]', 'Medical Scientific', '📝 SECTION 5: REGIONAL WAREHOUSE LOGISTICS & LEGACY 2024 NOTICES', '99.0', '[]', '**Year 1 Guaranteed Output:** 99', 13, 'high', '2636d383-86d4-445f-8334-e8fc8319d5e6', '81ec6c2bc85a143bfc696630d920d99cbdb15ec5faf0b5f81bc6e9593b3239d3', 'text-embedding-3-small', 'ai', 'small', NULL, 'pdf');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('616a1269b51f3bcc0b6314001ae6528bd111f8a2ffee8563ab787a1e545ceb05', 'admin', '**Year 1 Guaranteed Output:** 99.0% of nominal rated peak power output.
**Annual Degradation Rate (Years 2-30):** Maximum 0.35% linear annual degradation.
**Year 10 Guaranteed Output:** 95.8% of nominal rated peak power output.
**Year 20 Guaranteed Output:** 92.35% of nominal rated peak power output.
**Year 25 Guaranteed Output:** 90.60% of nominal rated peak power output.
**Year 30 Guaranteed Output:** 88.85% of nominal rated peak power output.', 'v1787143279288', '2026-08-19 12:41:54', '["guaranteed-power-output-over-time","92.35","90.60","88.85","guaranteed-output","annual-degradation-rate","medical-scientific","year"]', 'Medical Scientific', '🔍 Guaranteed Power Output Over Time', '99.0', '[]', '**Year 1 Guaranteed Output:** 99', 14, 'high', '2636d383-86d4-445f-8334-e8fc8319d5e6', '7a3e6e66adca686e610e9eb8ed813b4fbdcf7617b8aa35d3736df95e72ded8eb', 'text-embedding-3-small', 'ai', 'small', NULL, 'pdf');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('d00aad1feae1c349c54a249cc8398358d0ee9297541dff6b3fd6cc852ac0f128', 'admin', '## SECTION 5: REGIONAL WAREHOUSE LOGISTICS & LEGACY 2024 NOTICES', 'v1787143279288', '2026-08-19 12:41:54', '["guaranteed-power-output-over-time","LEGACY","medical-scientific"]', 'Medical Scientific', '🔍 Guaranteed Power Output Over Time', NULL, '[]', '## SECTION 5: REGIONAL WAREHOUSE LOGISTICS & LEGACY 2024 NOTICES', 15, 'high', '2636d383-86d4-445f-8334-e8fc8319d5e6', 'f409e5b3be48ef6fa0ad17a50e428286b24df3dcda974934820cc054f611817f', 'text-embedding-3-small', 'ai', 'small', NULL, 'pdf');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('a59c64990971f8a88fc69d82d2909a9edec001a898354224ffe939d16e7f9376', 'admin', '**Regional Equipment Warehouse (Parts Pickup Only):** 3200 Polaris Ave, Suite 12, Las Vegas, NV 89102 (Note: This is an industrial logistics warehouse for certified contractors only, NOT a customer service office).
**Legacy 2024 Technical Manual Clause:** Outdated 2024 revision mentions a $250 RMA restocking fee for return of undamaged modules (This technical clause is completely superseded by the 2026 Corporate Policy of $150 flat permit fee).', 'v1787143279288', '2026-08-19 12:41:54', '["guaranteed-power-output-over-time","NV","RMA","important-note","regional-equipment-warehouse","parts-pickup-only","medical-scientific","contact-info"]', 'Medical Scientific', '🔍 Guaranteed Power Output Over Time', NULL, '[]', '**Regional Equipment Warehouse (Parts Pickup Only):** 3200 Polaris Ave, Suite 12, Las Vegas, NV 89102 (Note: This is an industrial logistics warehouse for certified contractors only, NOT a customer se', 16, 'high', '2636d383-86d4-445f-8334-e8fc8319d5e6', '529eaba512c99cd826f499f8bbc2c1dd51fefd12d0dae213bd50a10de698704e', 'text-embedding-3-small', 'ai', 'small', NULL, 'pdf');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('1b61f80917e2ef8e7d2952f00c96fb7d048e8f8667a266208ce1ac3cd9ee8447', 'admin', '## SECTION 6: CLEANING, THERMAL CARE & DUST MITIGATION PROTOCOLS

**Cleaning Water Specification:** Deionized reverse-osmosis water with Total Dissolved Solids (TDS) under 20 ppm.
**Cleaning Tool Standards:** Microfiber telescopic water-fed poles with soft natural bristles; no rotary pressure washers.
**Thermal Shock Warning:** Never apply cold water to panels when ambient temperature exceeds 95°F or during direct sunlight.', 'v1787143279288', '2026-08-19 12:41:54', '["guaranteed-power-output-over-time","CARE","DUST","TDS","important-note","cleaning-water-specification","total-dissolved-solids","medical-scientific"]', 'Medical Scientific', '🔍 Guaranteed Power Output Over Time', NULL, '[]', '## SECTION 6: CLEANING, THERMAL CARE & DUST MITIGATION PROTOCOLS

**Cleaning Water Specification:** Deionized reverse-osmosis water with Total Dissolved Solids (TDS) under 20 ppm', 17, 'high', '2636d383-86d4-445f-8334-e8fc8319d5e6', '143607b1aed8aa7d7ad05a172f73d6624ad78fa78ec48c2e1bc7325b4c6c0ef8', 'text-embedding-3-small', 'ai', 'small', NULL, 'pdf');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('309d2fc36ab26f41d54a38f5a87630107ad4dc74d1413f7a1bfb8608c85c56e7', 'admin', '## SECTION 7: MOUNTING TORQUE & CLAMPING SPECIFICATIONS

**Mid-Clamp Torque:** 11.5 N·m to 14.0 N·m (8.5 to 10.3 ft-lbs) using M8 stainless steel hardware.
**End-Clamp Torque:** 13.0 N·m to 15.5 N·m (9.6 to 11.4 ft-lbs) with universal black anodized end stops.
**Rail Spanning Limits:** Maximum unsupported rail cantilever. 18 inches (457mm) on standard asphalt shingle.

## SECTION 8: ELECTRICAL TEST & COMMISSIONING VERIFICATION

**Open Circuit Voltage Test:** Measure Voc on every series string prior to inverter connection (must be within ±5% of calculated STC string voltage).
**Insulation Resistance Test (Megger):** Test positive and negative conductors to ground at 1000V DC (minimum reading > 50 M-Ohms required).
```

---

```markdown
APEX ULTRAVOLT-X PRO 450W — COMPLETE ENGINEERING & INSTALLATION MANUAL

SUPPLEMENTAL APPENDIX — REGULATORY COMPLIANCE & VERIFICATION DATA

This appendix records archival state filings, calibration logs, and jurisdiction-specific regulatory code provisions.

Apex Solar Solutions Inc. — Confidential & Proprietary Operational Manual                                            Page 3 of 5
```

```markdown
APEX ULTRAVOLT-X PRO 450W — COMPLETE ENGINEERING & INSTALLATION MANUAL

SUPPLEMENTAL APPENDIX — REGULATORY COMPLIANCE & VERIFICATION DATA', 'v1787143279288', '2026-08-19 12:41:54', '["section-7-mounting-torque-clamping-specifications","section-8-electrical-test-commissioning-verificati","TORQUE","TEST","STC","DC","APEX","PRO"]', 'Medical Scientific', '📝 SECTION 7: MOUNTING TORQUE & CLAMPING SPECIFICATIONS', '11.5', '[]', '## SECTION 7: MOUNTING TORQUE & CLAMPING SPECIFICATIONS

**Mid-Clamp Torque:** 11', 18, 'high', '2636d383-86d4-445f-8334-e8fc8319d5e6', '79362bf49f71c2da92ac63c023a30ef6e406efc7005a7533a85d083a05837b30', 'text-embedding-3-small', 'ai', 'small', NULL, 'pdf');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('e3bc17ec141b8cac57cd554e9695ff71077027b04f229502f5ebd5fd8d2e9c4f', 'admin', '## SECTION 7: MOUNTING TORQUE & CLAMPING SPECIFICATIONS

**Mid-Clamp Torque:** 11.5 N·m to 14.0 N·m (8.5 to 10.3 ft-lbs) using M8 stainless steel hardware.
**End-Clamp Torque:** 13.0 N·m to 15.5 N·m (9.6 to 11.4 ft-lbs) with universal black anodized end stops.
**Rail Spanning Limits:** Maximum unsupported rail cantilever. 18 inches (457mm) on standard asphalt shingle.

## SECTION 8: ELECTRICAL TEST & COMMISSIONING VERIFICATION', 'v1787143279288', '2026-08-19 12:41:54', '["warehouse-logistics-and-notices","section-8-electrical-test-commissioning-verificati","TORQUE","TEST","clamp-torque","rail-spanning-limits","medical-scientific","contact-info"]', 'Medical Scientific', '🔍 Warehouse Logistics and Notices', '11.5', '[]', '## SECTION 7: MOUNTING TORQUE & CLAMPING SPECIFICATIONS

**Mid-Clamp Torque:** 11', 19, 'high', '2636d383-86d4-445f-8334-e8fc8319d5e6', 'ce12698bc0dab52867fbf3aa71894c4847b21d3434bcadb3e33334275c638190', 'text-embedding-3-small', 'ai', 'small', NULL, 'pdf');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('083df4041678f1cdd0b496981a810507728e125ffa7bc9b57896e2f28262756a', 'admin', '**Open Circuit Voltage Test:** Measure Voc on every series string prior to inverter connection (must be within ±5% of calculated STC string voltage).
**Insulation Resistance Test (Megger):** Test positive and negative conductors to ground at 1000V DC (minimum reading > 50 M-Ohms required).
```

---

```markdown
APEX ULTRAVOLT-X PRO 450W — COMPLETE ENGINEERING & INSTALLATION MANUAL

SUPPLEMENTAL APPENDIX — REGULATORY COMPLIANCE & VERIFICATION DATA', 'v1787143279288', '2026-08-19 12:41:54', '["warehouse-logistics-and-notices","STC","DC","APEX","PRO","MANUAL","DATA","open-circuit-voltage-test"]', 'Medical Scientific', '🔍 Warehouse Logistics and Notices', NULL, '[]', '**Open Circuit Voltage Test:** Measure Voc on every series string prior to inverter connection (must be within ±5% of calculated STC string voltage)', 20, 'high', '2636d383-86d4-445f-8334-e8fc8319d5e6', 'b156d6285a274ce4133fcfa2a6601ac10f0560c87ae0ffb4c5b47a58cfcef50e', 'text-embedding-3-small', 'ai', 'small', NULL, 'pdf');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('f3bf6534462bcfd6a38551629d4a82f50f71ec33fdad1711d76af5bf8c74d7aa', 'admin', 'This appendix records archival state filings, calibration logs, and jurisdiction-specific regulatory code provisions.

Apex Solar Solutions Inc. — Confidential & Proprietary Operational Manual                                            Page 3 of 5
```

```markdown
APEX ULTRAVOLT-X PRO 450W — COMPLETE ENGINEERING & INSTALLATION MANUAL

SUPPLEMENTAL APPENDIX — REGULATORY COMPLIANCE & VERIFICATION DATA', 'v1787143279288', '2026-08-19 12:41:54', '["warehouse-logistics-and-notices","APEX","PRO","MANUAL","DATA","apex-solar-solutions-inc","medical-scientific","legal"]', 'Medical Scientific', '🔍 Warehouse Logistics and Notices', NULL, '[]', 'This appendix records archival state filings, calibration logs, and jurisdiction-specific regulatory code provisions', 21, 'high', '2636d383-86d4-445f-8334-e8fc8319d5e6', 'a7cb4d6650251ac35aca553762610a43b1255c4344fc8f044b2cc3c798920b79', 'text-embedding-3-small', 'ai', 'small', NULL, 'pdf');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('defc3cad2e9cee7c3da20e551e9d0eade989d442a8dc020e9b1aaba20c33dd6c', 'admin', 'This appendix records archival state filings, calibration logs, and jurisdiction-specific regulatory code provisions.

Apex Solar Solutions Inc. — Confidential & Proprietary Operational Manual                                            Page 4 of 5
```

---

```markdown
APEX ULTRAVOLT-X PRO 450W — COMPLETE ENGINEERING & INSTALLATION MANUAL

SUPPLEMENTAL APPENDIX — REGULATORY COMPLIANCE & VERIFICATION DATA

This appendix records archival state filings, calibration logs, and jurisdiction-specific regulatory code provisions.

Apex Solar Solutions Inc. — Confidential & Proprietary Operational Manual                           Page 5 of 5
```', 'v1787143279288', '2026-08-19 12:41:54', '["APEX","PRO","MANUAL","DATA","apex-solar-solutions-inc","medical-scientific","legal","compliance"]', 'Medical Scientific', '📝 Medium Chunk', NULL, '[]', 'This appendix records archival state filings, calibration logs, and jurisdiction-specific regulatory code provisions', 22, 'high', '2636d383-86d4-445f-8334-e8fc8319d5e6', '0cfc4390910305a0a9395fc691397a737a32223b199ca76beda19e0275a94bb2', 'text-embedding-3-small', 'ai', 'small', NULL, 'pdf');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('ad017c84ff12f6e1a1610177a781b5c818ebd1a07acdcf3acf03583e75ddffb4', 'admin', 'This appendix records archival state filings, calibration logs, and jurisdiction-specific regulatory code provisions.

Apex Solar Solutions Inc. — Confidential & Proprietary Operational Manual                                            Page 4 of 5
```

---

```markdown
APEX ULTRAVOLT-X PRO 450W — COMPLETE ENGINEERING & INSTALLATION MANUAL

SUPPLEMENTAL APPENDIX — REGULATORY COMPLIANCE & VERIFICATION DATA', 'v1787143279288', '2026-08-19 12:41:54', '["cleaning-and-maintenance-protocols","APEX","PRO","MANUAL","DATA","apex-solar-solutions-inc","medical-scientific","legal"]', 'Medical Scientific', '🔍 Cleaning and Maintenance Protocols', NULL, '[]', 'This appendix records archival state filings, calibration logs, and jurisdiction-specific regulatory code provisions', 23, 'high', '2636d383-86d4-445f-8334-e8fc8319d5e6', 'd287f8c6468e7ac2a81468f7bf81365dbeb3ea2a5e068eb51c7b4ac0e5df62cf', 'text-embedding-3-small', 'ai', 'small', NULL, 'pdf');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('97f2d29cd2e15d8acf282d28b886576682c00ad6ade92eba52847aa984e665b6', 'admin', 'This appendix records archival state filings, calibration logs, and jurisdiction-specific regulatory code provisions.

Apex Solar Solutions Inc. — Confidential & Proprietary Operational Manual                           Page 5 of 5
```', 'v1787143279288', '2026-08-19 12:41:54', '["cleaning-and-maintenance-protocols","apex-solar-solutions-inc","medical-scientific","jurisdiction-specific","apex solar solutions inc","confidential","see-chunk-21","see-chunk-22"]', 'Medical Scientific', '🔍 Cleaning and Maintenance Protocols', NULL, '[]', 'This appendix records archival state filings, calibration logs, and jurisdiction-specific regulatory code provisions', 24, 'high', '2636d383-86d4-445f-8334-e8fc8319d5e6', '40db7b6437292ab3ca68bf83f5f0789dddbf719d5dcb48769ea9f868bc339ace', 'text-embedding-3-small', 'ai', 'small', NULL, 'pdf');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('6d5fc09ceceab0f78cb3679b0890faa335dc89ecafd40b606022095d0fa16e82', 'admin', '# Sponsorship - Solar Energy International (SEI): Solar Training for Clean Energy Careers

Sponsorship - Solar Energy International (SEI): Solar Training for Clean Energy Careers

Skip to content

Menu

Sponsorship    Chris    2026-01-08T09:40:54-07:00

#  SPONSORSHIP

Welcome to SEI’s Sponsorship Kit. Within you will find the services that our partners are using to achieve their branding, business development, and thought leadership goals.

As a leading technical training provider for the global solar energy workforce, SEI is uniquely positioned to help you realize your media strategy with full support from our expert curriculum development, technical instructor, and marketing teams. Our products and services partner you with these experts to ensure your message is highlighted alongside our industry-leading content and that it reaches your target audience.

## Instructor Training Sponsorship

Collaborate with industry experts, share your products, and train your technical staff side-by-side with 100 of the industry&#8217;s brightest solar SMEs.

## Sponsored Media

Partner with SEI via Sponsored Seminars, Custom Webinars, and Sponsored Content Articles.

## Sponsor a Scholarship

Align your brand with the growing global solar energy workforce by creating a Scholarship Fund.

## Facility Naming Rights

Claim your spot on one of SEI’s new buildings, prominently displaying your logo via naming rights.

## Product Integration

Incorporate your latest products in one of SEI’s hands-on training lab yards in Colorado, Costa Rica or Oman.

#  PROGRAM SPONSORSHIP OPTIONS

See sponsorship and program support options below. Reach out to our team to request a specific partnership proposal or with any questions.

####  Who We Are

A great first thing to share

####  2023 Annual Report

Overview of what SEI does

####  2024 Annual Report

Overview of what SEI does

####  International Programs

Learn about SEI&#8217;s global impact

####  Solar in the Schools

Learn more & download

####  Veterans Program

Learn more & download

####  Johnny Weiss Initiative

Learn more & download

####  Native American Program

Learn more & download

####  Women in Solar Power

Learn more & download

####  Welcome Letter

Read this first!

# GET IN TOUCH

Please take time to review the offerings above. We welcome any inquiries and look forward to working with you and your team in the near future.

-  First & Last Name  *        Email  *

-  Title
-  Company
-  Phone  *        Area(s) of Interest  *

Instructor Training Sponsorship

Sponsored Media

Sponsor a Scholarship

Facility Naming Rights

Product Integration

-  Phone     This field is for validation purposes and should be left unchanged.

#  WHO WE ARE

#  100K+

SEI ALUMNI

#  10%+

WORLD&#8217;S SOLAR INVOLVED ALUMNI

#  31K+

SOLAR INSTALLED BY ALUMNI

#  692K+

UNIQUE PAGEVIEWS PER YEAR

#  90K+

TOTAL EMAIL CONTACTS

#  279K+

SOCIAL MEDIA CONNECTIONS

Close product quick view &times;

##', 'v1', '2026-08-19 13:12:16', '["sponsorship-solar-energy-international-sei-solar-t","sponsorship","instructor-training-sponsorship","sponsored-media","sponsor-a-scholarship","facility-naming-rights","product-integration","program-sponsorship-options"]', 'Prose Standard', '📄 Sponsorship - Solar Energy International (SEI): Solar Training for Clean Energy Careers', NULL, '[]', '# Sponsorship - Solar Energy International (SEI): Solar Training for Clean Energy Careers

Sponsorship - Solar Energy International (SEI): Solar Training for Clean Energy Careers

Skip to content

Men', 0, 'high', 'web_CCFoP3bGdDMW', 'e76560c97f9f0d172a836b71b9aa74dc0608dcdc1308a618c71e422e80bc118d', 'text-embedding-3-small', 'ai', 'large', NULL, 'web');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('c1b604e910625d24a6430f474b7d9941b98e773a8a560bb9c0bc3ed9dfa4bb70', 'admin', '# Sponsorship - Solar Energy International (SEI): Solar Training for Clean Energy Careers

Sponsorship - Solar Energy International (SEI): Solar Training for Clean Energy Careers

Skip to content

Menu

Sponsorship    Chris    2026-01-08T09:40:54-07:00

#  SPONSORSHIP

Welcome to SEI’s Sponsorship Kit. Within you will find the services that our partners are using to achieve their branding, business development, and thought leadership goals.

As a leading technical training provider for the global solar energy workforce, SEI is uniquely positioned to help you realize your media strategy with full support from our expert curriculum development, technical instructor, and marketing teams. Our products and services partner you with these experts to ensure your message is highlighted alongside our industry-leading content and that it reaches your target audience.

## Instructor Training Sponsorship

Collaborate with industry experts, share your products, and train your technical staff side-by-side with 100 of the industry&#8217;s brightest solar SMEs.

## Sponsored Media

Partner with SEI via Sponsored Seminars, Custom Webinars, and Sponsored Content Articles.

## Sponsor a Scholarship

Align your brand with the growing global solar energy workforce by creating a Scholarship Fund.

## Facility Naming Rights', 'v1', '2026-08-19 13:12:16', '["sponsorship-solar-energy-international-sei-solar-t","sponsorship","instructor-training-sponsorship","sponsored-media","sponsor-a-scholarship","facility-naming-rights","SEI","solar-energy-international"]', 'Prose Standard', '📝 Sponsorship - Solar Energy International (SEI): Solar Training for Clean Energy Careers', NULL, '[]', '# Sponsorship - Solar Energy International (SEI): Solar Training for Clean Energy Careers

Sponsorship - Solar Energy International (SEI): Solar Training for Clean Energy Careers

Skip to content

Men', 1, 'high', 'web_CCFoP3bGdDMW', 'bc3c1b1d9158777691c476b4cbc13d9b93333e32b848fd2990dacab6136be273', 'text-embedding-3-small', 'ai', 'medium', 'a6f1468e-4482-44a0-854f-14df80ca4d64_L_1', 'web');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('63e301909fd83e151e9e9ceaba3ebf09409e5b4526728a75a90c55ff2bdd27f8', 'admin', '# Sponsorship - Solar Energy International (SEI): Solar Training for Clean Energy Careers

Sponsorship - Solar Energy International (SEI): Solar Training for Clean Energy Careers

Skip to content

Menu

Sponsorship    Chris    2026-01-08T09:40:54-07:00

#  SPONSORSHIP

Welcome to SEI’s Sponsorship Kit.

Within you will find the services that our partners are using to achieve their branding, business development, and thought leadership goals.', 'v1', '2026-08-19 13:12:17', '["overview-of-sei-sponsorship","sponsorship","SEI","solar-energy-international","solar-training","clean-energy-careers-sponsorship","prose-standard"]', 'Prose Standard', '🔍 Overview of SEI Sponsorship', NULL, '[]', '# Sponsorship - Solar Energy International (SEI): Solar Training for Clean Energy Careers

Sponsorship - Solar Energy International (SEI): Solar Training for Clean Energy Careers

Skip to content

Men', 2, 'high', 'web_CCFoP3bGdDMW', '05d4d72fb0d8459ca3fe04179428b397024a7ff273736d8c066b6ffcb82eb338', 'text-embedding-3-small', 'ai', 'small', 'a6f1468e-4482-44a0-854f-14df80ca4d64_M_2', 'web');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('d1771cb981605c5c4955ac500989a2511b94ba4c859e91e56a0f2bb9d75c72ae', 'admin', 'As a leading technical training provider for the global solar energy workforce, SEI is uniquely positioned to help you realize your media strategy with full support from our expert curriculum development, technical instructor, and marketing teams.

Our products and services partner you with these experts to ensure your message is highlighted alongside our industry-leading content and that it reaches your target audience.', 'v1', '2026-08-19 13:12:17', '["overview-of-sei-sponsorship","SEI","prose-standard"]', 'Prose Standard', '🔍 Overview of SEI Sponsorship', NULL, '[]', 'As a leading technical training provider for the global solar energy workforce, SEI is uniquely positioned to help you realize your media strategy with full support from our expert curriculum developm', 3, 'high', 'web_CCFoP3bGdDMW', '482e2e8540fadfc8fc2336d3637791a6b30b614104c1d0500e7d4be927014eee', 'text-embedding-3-small', 'ai', 'small', 'a6f1468e-4482-44a0-854f-14df80ca4d64_M_2', 'web');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('df3702ff3b6fe7669e2d22f2cc9c87dcdffe8dbfbe53c6df92e347909bc06c33', 'admin', '## Instructor Training Sponsorship

Collaborate with industry experts, share your products, and train your technical staff side-by-side with 100 of the industry&#8217;s brightest solar SMEs.

## Sponsored Media

Partner with SEI via Sponsored Seminars, Custom Webinars, and Sponsored Content Articles.

## Sponsor a Scholarship

Align your brand with the growing global solar energy workforce by creating a Scholarship Fund.', 'v1', '2026-08-19 13:12:17', '["overview-of-sei-sponsorship","sponsored-media","sponsor-a-scholarship","SEI","instructor-training-sponsorship-collaborate","sponsored-media-partner","sponsored-seminars","prose-standard"]', 'Prose Standard', '🔍 Overview of SEI Sponsorship', NULL, '[]', '## Instructor Training Sponsorship

Collaborate with industry experts, share your products, and train your technical staff side-by-side with 100 of the industry&#8217;s brightest solar SMEs', 4, 'high', 'web_CCFoP3bGdDMW', '4c5b3dd0d9a24893a8e25acc612ebca8e27c95b896ab360addd9b092c44299f4', 'text-embedding-3-small', 'ai', 'small', 'a6f1468e-4482-44a0-854f-14df80ca4d64_M_2', 'web');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('6ec5fdbecbfe5eb08b551e79524a88678b6f13a0867d8440a1b4666fb77114a8', 'admin', '## Facility Naming Rights', 'v1', '2026-08-19 13:12:17', '["overview-of-sei-sponsorship","SEI","facility-naming-rights","prose-standard"]', 'Prose Standard', '🔍 Overview of SEI Sponsorship', NULL, '[]', '## Facility Naming Rights', 5, 'high', 'web_CCFoP3bGdDMW', '2cad79741f01cdafb1f855ebc3c780b9e459bc45edaac854baae0ab293f13151', 'text-embedding-3-small', 'ai', 'small', 'a6f1468e-4482-44a0-854f-14df80ca4d64_M_2', 'web');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('e99257b80a6a3ff155bee2f90cc9833325ee06fcb8fccf3bc342951159008062', 'admin', 'Claim your spot on one of SEI’s new buildings, prominently displaying your logo via naming rights.

## Product Integration

Incorporate your latest products in one of SEI’s hands-on training lab yards in Colorado, Costa Rica or Oman.

#  PROGRAM SPONSORSHIP OPTIONS

See sponsorship and program support options below. Reach out to our team to request a specific partnership proposal or with any questions.

####  Who We Are

A great first thing to share

####  2023 Annual Report

Overview of what SEI does

####  2024 Annual Report

Overview of what SEI does

####  International Programs

Learn about SEI&#8217;s global impact

####  Solar in the Schools

Learn more & download

####  Veterans Program

Learn more & download

####  Johnny Weiss Initiative

Learn more & download

####  Native American Program

Learn more & download

####  Women in Solar Power

Learn more & download

####  Welcome Letter

Read this first!

# GET IN TOUCH

Please take time to review the offerings above. We welcome any inquiries and look forward to working with you and your team in the near future.

-  First & Last Name  *        Email  *

-  Title
-  Company
-  Phone  *        Area(s) of Interest  *

Instructor Training Sponsorship

Sponsored Media

Sponsor a Scholarship

Facility Naming Rights

Product Integration

-  Phone     This field is for validation purposes and should be left unchanged.', 'v1', '2026-08-19 13:12:17', '["product-integration","program-sponsorship-options","who-we-are","2023-annual-report","2024-annual-report","international-programs","solar-in-the-schools","veterans-program"]', 'Prose Standard', '📝 Product Integration', NULL, '[]', 'Claim your spot on one of SEI’s new buildings, prominently displaying your logo via naming rights', 6, 'high', 'web_CCFoP3bGdDMW', '1dba230d8eeb43ce7b7b5c05e9c4c964904d8687065e0eb0d22b9b7711c80878', 'text-embedding-3-small', 'ai', 'medium', 'a6f1468e-4482-44a0-854f-14df80ca4d64_L_1', 'web');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('be10fd36e11886c115ceb7f4ee01431da04b12f055dcf524d17ca8084ed32efd', 'admin', 'Claim your spot on one of SEI’s new buildings, prominently displaying your logo via naming rights.

## Product Integration

Incorporate your latest products in one of SEI’s hands-on training lab yards in Colorado, Costa Rica or Oman.

#  PROGRAM SPONSORSHIP OPTIONS

See sponsorship and program support options below.

Reach out to our team to request a specific partnership proposal or with any questions.

####  Who We Are', 'v1', '2026-08-19 13:12:17', '["instructor-training-sponsorship","product-integration","program-sponsorship-options","who-we-are","SEI","product-integration-incorporate","costa-rica","prose-standard"]', 'Prose Standard', '🔍 Instructor Training Sponsorship', NULL, '[]', 'Claim your spot on one of SEI’s new buildings, prominently displaying your logo via naming rights', 7, 'high', 'web_CCFoP3bGdDMW', '6ae1342a5e6950c3043f904eae3f6f96a6259dae5ea2a56369d858a95f372258', 'text-embedding-3-small', 'ai', 'small', 'a6f1468e-4482-44a0-854f-14df80ca4d64_M_7', 'web');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('045cdc4a215d82dbcef3c88e61b621be594eb393411e6fc1cdd8e42f8bc4b2bf', 'admin', 'A great first thing to share

####  2023 Annual Report

Overview of what SEI does

####  2024 Annual Report

Overview of what SEI does

####  International Programs

Learn about SEI&#8217;s global impact

####  Solar in the Schools

Learn more & download

####  Veterans Program

Learn more & download

####  Johnny Weiss Initiative

Learn more & download

####  Native American Program

Learn more & download

####  Women in Solar Power', 'v1', '2026-08-19 13:12:17', '["instructor-training-sponsorship","2023-annual-report","2024-annual-report","international-programs","solar-in-the-schools","veterans-program","johnny-weiss-initiative","native-american-program"]', 'Prose Standard', '🔍 Instructor Training Sponsorship', NULL, '[]', 'A great first thing to share

####  2023 Annual Report

Overview of what SEI does

####  2024 Annual Report

Overview of what SEI does

####  International Programs

Learn about SEI&#8217;s global imp', 8, 'high', 'web_CCFoP3bGdDMW', '6351c38f7b5e6d8fcfc3f8feb8df49766de6644767de8ec01afb29807d96d104', 'text-embedding-3-small', 'ai', 'small', 'a6f1468e-4482-44a0-854f-14df80ca4d64_M_7', 'web');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('43657a8c7a341ece8dd2fd819ab1dfbe9fe59a674527f80e9e3fe966869d652e', 'admin', 'Learn more & download

####  Welcome Letter

Read this first!

# GET IN TOUCH

Please take time to review the offerings above.

We welcome any inquiries and look forward to working with you and your team in the near future.

-  First & Last Name  *        Email  *

-  Title
-  Company
-  Phone  *        Area(s) of Interest  *

Instructor Training Sponsorship

Sponsored Media

Sponsor a Scholarship

Facility Naming Rights

Product Integration', 'v1', '2026-08-19 13:12:17', '["instructor-training-sponsorship","welcome-letter","get-in-touch","IN","TOUCH","welcome-letter-read","last-name","prose-standard"]', 'Prose Standard', '🔍 Instructor Training Sponsorship', NULL, '[]', 'Learn more & download

####  Welcome Letter

Read this first', 9, 'high', 'web_CCFoP3bGdDMW', '8d4a650f90ee5e7ac923f3b4c0b38b7b78d5b54ab883a537a35c6c20af57ef0a', 'text-embedding-3-small', 'ai', 'small', 'a6f1468e-4482-44a0-854f-14df80ca4d64_M_7', 'web');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('187886fd4c1d45cc9062f69e1265df1e4d0d17890a5e8c3c57980a05a6c10095', 'admin', '-  Phone     This field is for validation purposes and should be left unchanged.', 'v1', '2026-08-19 13:12:17', '["instructor-training-sponsorship","phone-this","prose-standard"]', 'Prose Standard', '🔍 Instructor Training Sponsorship', NULL, '[]', '-  Phone     This field is for validation purposes and should be left unchanged', 10, 'high', 'web_CCFoP3bGdDMW', '070d4ba86183484bd480924433479efd18ff3b91f745eb2775192b913f41d92f', 'text-embedding-3-small', 'ai', 'small', 'a6f1468e-4482-44a0-854f-14df80ca4d64_M_7', 'web');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('db7e016915e643f11d5841c946d2533dfb49d8a010fea89b6cb4fba4962a5f85', 'admin', '#  WHO WE ARE

#  100K+

SEI ALUMNI

#  10%+

WORLD&#8217;S SOLAR INVOLVED ALUMNI

#  31K+

SOLAR INSTALLED BY ALUMNI

#  692K+

UNIQUE PAGEVIEWS PER YEAR

#  90K+

TOTAL EMAIL CONTACTS

#  279K+

SOCIAL MEDIA CONNECTIONS

Close product quick view &times;

##', 'v1', '2026-08-19 13:12:17', '["who-we-are","100k","31k","692k","90k","279k","WE","SEI"]', 'Prose Standard', '📝 WHO WE ARE', NULL, '[]', '#  WHO WE ARE

#  100K+

SEI ALUMNI

#  10%+

WORLD&#8217;S SOLAR INVOLVED ALUMNI

#  31K+

SOLAR INSTALLED BY ALUMNI

#  692K+

UNIQUE PAGEVIEWS PER YEAR

#  90K+

TOTAL EMAIL CONTACTS

#  279K+

SOC', 11, 'high', 'web_CCFoP3bGdDMW', 'c6931d8af452ded89174a6188b933b739b210ce47db15cb8e6529e84521a3274', 'text-embedding-3-small', 'ai', 'medium', 'a6f1468e-4482-44a0-854f-14df80ca4d64_L_1', 'web');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('de0fac80eca1264fd68be06e481e1368b1074b006877d5ea8afbba4ae3c8ae3d', 'admin', '#  WHO WE ARE

#  100K+

SEI ALUMNI

#  10%+

WORLD&#8217;S SOLAR INVOLVED ALUMNI

#  31K+

SOLAR INSTALLED BY ALUMNI

#  692K+

UNIQUE PAGEVIEWS PER YEAR

#  90K+

TOTAL EMAIL CONTACTS

#  279K+

SOCIAL MEDIA CONNECTIONS

Close product quick view &times;

##', 'v1', '2026-08-19 13:12:17', '["sponsored-media-opportunities","100k","31k","692k","90k","279k","WE","SEI"]', 'Prose Standard', '🔍 Sponsored Media Opportunities', NULL, '[]', '#  WHO WE ARE

#  100K+

SEI ALUMNI

#  10%+

WORLD&#8217;S SOLAR INVOLVED ALUMNI

#  31K+

SOLAR INSTALLED BY ALUMNI

#  692K+

UNIQUE PAGEVIEWS PER YEAR

#  90K+

TOTAL EMAIL CONTACTS

#  279K+

SOC', 12, 'high', 'web_CCFoP3bGdDMW', 'c6931d8af452ded89174a6188b933b739b210ce47db15cb8e6529e84521a3274', 'text-embedding-3-small', 'ai', 'small', 'a6f1468e-4482-44a0-854f-14df80ca4d64_M_12', 'web');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('dc02127ff8a355bc6892b2bf6adf7e42cc944e257f62b6176403c52da79146cb', 'admin', '# Clean Energy Careers Grow Here

Clean Energy Careers Grow Here

Skip to content

Menu

Clean Energy Careers Grow Here    Chris    2026-07-21T10:38:45-06:00

-
-
-
-
-

#   Keep Your Solar Knowledge Current

SEI&#8217;s Continuing Education course library is always expanding with flexible, relevant online training built for working solar professionals. Short courses are available on demand, so you can get started today.

BROWSE CE COURSES            BROWSE CE COURSES                    Training for Individuals            Training for Industry            Supporters of Solar

#  LAUNCH YOUR CAREER IN SOLAR

#  LAUNCH YOUR CAREER IN SOLAR

From first job to advanced skills, our training connects you to the careers of tomorrow.

From first job to advanced skills, our training connects you to the careers of tomorrow.

## Industry-leading Education

Highly experienced instructors and constantly updated curriculum.

## Trusted for Over 30 Years

Established in 1991, SEI has been serving students ever since.

## NABCEP Certified Training

SEI&#8217;s training helps meet NABCEP certification exam requirements.

&times;

###

#  TRAIN YOUR WORKFORCE

#  TRAIN YOUR WORKFORCE

Equipping your team with the technical expertise and safety certification needed to lead your market.

Equipping your team with the technical expertise and safety certification needed to lead your market.

Get your team the technical skills they need to stay ahead. Whether you require group-discounted online courses, custom instructor-led sessions, or hands-on workshops at our facility or yours, SEI delivers training solutions tailored to your organization&#8217;s goals. Trusted by top EPCs, manufacturers, and government agencies worldwide to build safer, more efficient workforces.

LEARN MORE                 &times;

###

REAL PEOPLE.

REAL TRAINING.

IMMEDIATE IMPACT.

REAL PEOPLE.

REAL TRAINING.

IMMEDIATE IMPACT.

Right now, solar is at a crossroads&#8230;

Right now, solar is at a crossroads&#8230;

Federal pullback slashed America&#8217;s renewables forecast in half. Yet energy demand is exploding. Solar is now cheaper than natural gas and faster to deploy than ever before.

The technology is ready. The market exists. What&#8217;s missing?  The solar warriors to install it .

Here&#8217;s where you can help: we&#8217;re funding scholarships for technicians ready to step into this moment. Your gift determines whether they get trained this year or wait another.

FUND A SOLAR WARRIOR                 &times;

###

#  A NEW INITIATIVE

#  A NEW INITIATIVE

Empowering Communities. Honoring a Legacy. Expanding Global Access to Solar Energy Education.

Empowering Communities. Honoring a Legacy. Expanding Global Access to Solar Energy Education.

The Johnny Weiss Solar Energy For All Initiative   continues the legacy of Solar Energy International&#8217;s co-founder Johnny Weiss, who believed renewable energy training should be accessible to everyone. While SEI has trained over 150,000 people in 100+ countries since 1991, an estimated 775 million people still lack electricity access, with many still experiencing unreliable power for daily needs. This initiative specifically targets underserved communities where energy access is literally a matter of life and death, bringing solar education and training to those who need it most as part of SEI&#8217;s broader mission to address the persistent global energy gap.

LEARN MORE                 &times;

###', 'v1', '2026-08-19 13:12:48', '["clean-energy-careers-grow-here","keep-your-solar-knowledge-current","launch-your-career-in-solar","industry-leading-education","trusted-for-over-30-years","nabcep-certified-training","train-your-workforce","real-people"]', 'Prose Standard', '📄 Clean Energy Careers Grow Here', NULL, '[]', '# Clean Energy Careers Grow Here

Clean Energy Careers Grow Here

Skip to content

Menu

Clean Energy Careers Grow Here    Chris    2026-07-21T10:38:45-06:00

-
-
-
-
-

#   Keep Your Solar Knowledge ', 0, 'high', 'web_o8u7CYfuMtZ5', '1a7770879502d7fa3933e4f226636ec449e30ab40d5406bde07a8856cf6cdf51', 'text-embedding-3-small', 'ai', 'large', NULL, 'web');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('4260bfad480893590e0e6362621d780dcaf7448a47eb6e4a6f3696291b67a8d7', 'admin', '# Clean Energy Careers Grow Here

Clean Energy Careers Grow Here

Skip to content

Menu

Clean Energy Careers Grow Here    Chris    2026-07-21T10:38:45-06:00

-
-
-
-
-

#   Keep Your Solar Knowledge Current

SEI&#8217;s Continuing Education course library is always expanding with flexible, relevant online training built for working solar professionals. Short courses are available on demand, so you can get started today.

BROWSE CE COURSES            BROWSE CE COURSES                    Training for Individuals            Training for Industry            Supporters of Solar

#  LAUNCH YOUR CAREER IN SOLAR

#  LAUNCH YOUR CAREER IN SOLAR

From first job to advanced skills, our training connects you to the careers of tomorrow.

From first job to advanced skills, our training connects you to the careers of tomorrow.

## Industry-leading Education

Highly experienced instructors and constantly updated curriculum.

## Trusted for Over 30 Years

Established in 1991, SEI has been serving students ever since.

## NABCEP Certified Training

SEI&#8217;s training helps meet NABCEP certification exam requirements.

&times;

###

#  TRAIN YOUR WORKFORCE

#  TRAIN YOUR WORKFORCE

Equipping your team with the technical expertise and safety certification needed to lead your market.

Equipping your team with the technical expertise and safety certification needed to lead your market.', 'v1', '2026-08-19 13:12:48', '["clean-energy-careers-grow-here","keep-your-solar-knowledge-current","launch-your-career-in-solar","industry-leading-education","trusted-for-over-30-years","nabcep-certified-training","train-your-workforce","SEI"]', 'Prose Standard', '📝 Clean Energy Careers Grow Here', NULL, '[]', '# Clean Energy Careers Grow Here

Clean Energy Careers Grow Here

Skip to content

Menu

Clean Energy Careers Grow Here    Chris    2026-07-21T10:38:45-06:00

-
-
-
-
-

#   Keep Your Solar Knowledge ', 1, 'high', 'web_o8u7CYfuMtZ5', '7285b917de9b1546a756fbd164473e2bf8e19ae110e6bea27ee13f41fca88b94', 'text-embedding-3-small', 'ai', 'medium', 'e8915993-0b28-4e8d-812c-3995eb090804_L_1', 'web');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('ec77e9460c74d99217379a96973ea874ca4e7be96d18dc77c5c61651cc155d38', 'admin', '# Clean Energy Careers Grow Here

Clean Energy Careers Grow Here

Skip to content

Menu

Clean Energy Careers Grow Here    Chris    2026-07-21T10:38:45-06:00

-
-
-
-
-

#   Keep Your Solar Knowledge Current

SEI&#8217;s Continuing Education course library is always expanding with flexible, relevant online training built for working solar professionals.

Short courses are available on demand, so you can get started today.', 'v1', '2026-08-19 13:12:48', '["continuing-education-for-solar-professionals","keep-your-solar-knowledge-current","SEI","continuing-education","solar-professionals","clean-energy-careers-grow-here","prose-standard"]', 'Prose Standard', '🔍 Continuing Education for Solar Professionals', NULL, '[]', '# Clean Energy Careers Grow Here

Clean Energy Careers Grow Here

Skip to content

Menu

Clean Energy Careers Grow Here    Chris    2026-07-21T10:38:45-06:00

-
-
-
-
-

#   Keep Your Solar Knowledge ', 2, 'high', 'web_o8u7CYfuMtZ5', '5b5f15ee6963442ce41df6687fd4b49260a13fa3ba7e7e4d8a2f0a640a8aa481', 'text-embedding-3-small', 'ai', 'small', 'e8915993-0b28-4e8d-812c-3995eb090804_M_2', 'web');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('be9aecfb0de3485eee5d2a82baddbd15de7ace5cb1ab5769d5cfeed807a9d225', 'admin', 'BROWSE CE COURSES            BROWSE CE COURSES                    Training for Individuals            Training for Industry            Supporters of Solar

#  LAUNCH YOUR CAREER IN SOLAR

#  LAUNCH YOUR CAREER IN SOLAR

From first job to advanced skills, our training connects you to the careers of tomorrow.

From first job to advanced skills, our training connects you to the careers of tomorrow.

## Industry-leading Education', 'v1', '2026-08-19 13:12:48', '["continuing-education-for-solar-professionals","launch-your-career-in-solar","industry-leading-education","BROWSE","CE","LAUNCH","YOUR","CAREER"]', 'Prose Standard', '🔍 Continuing Education for Solar Professionals', NULL, '[]', 'BROWSE CE COURSES            BROWSE CE COURSES                    Training for Individuals            Training for Industry            Supporters of Solar

#  LAUNCH YOUR CAREER IN SOLAR

#  LAUNCH YO', 3, 'high', 'web_o8u7CYfuMtZ5', '859a259b1383edfdac7862a4765d5eea12b274c3f26472636072ff60baa0f47b', 'text-embedding-3-small', 'ai', 'small', 'e8915993-0b28-4e8d-812c-3995eb090804_M_2', 'web');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('29cf24e9a4bf776b4de5bd898746b026fc3117f498b969a9fa10ae9f5fa48b4d', 'admin', 'Highly experienced instructors and constantly updated curriculum.

## Trusted for Over 30 Years

Established in 1991, SEI has been serving students ever since.

## NABCEP Certified Training

SEI&#8217;s training helps meet NABCEP certification exam requirements.

&times;

###

#  TRAIN YOUR WORKFORCE

#  TRAIN YOUR WORKFORCE

Equipping your team with the technical expertise and safety certification needed to lead your market.', 'v1', '2026-08-19 13:12:48', '["continuing-education-for-solar-professionals","trusted-for-over-30-years","nabcep-certified-training","train-your-workforce","SEI","NABCEP","TRAIN","YOUR"]', 'Prose Standard', '🔍 Continuing Education for Solar Professionals', NULL, '[]', 'Highly experienced instructors and constantly updated curriculum', 4, 'high', 'web_o8u7CYfuMtZ5', 'c8510d6dd6d3026f60aa93e85e8f971d6ae1897013cab7d6155056a94a17988c', 'text-embedding-3-small', 'ai', 'small', 'e8915993-0b28-4e8d-812c-3995eb090804_M_2', 'web');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('e87933dce2bd53e8d4a9cdabee0ab5ceaea025b08ff2fd8586e33997e9b3d0c3', 'admin', 'Equipping your team with the technical expertise and safety certification needed to lead your market.', 'v1', '2026-08-19 13:12:48', '["continuing-education-for-solar-professionals","continuing-education","solar-professionals","prose-standard"]', 'Prose Standard', '🔍 Continuing Education for Solar Professionals', NULL, '[]', 'Equipping your team with the technical expertise and safety certification needed to lead your market', 5, 'high', 'web_o8u7CYfuMtZ5', '04f416729c2fe40aebd96027eed5d75f3cb6f785783e35b021d493cf8338148f', 'text-embedding-3-small', 'ai', 'small', 'e8915993-0b28-4e8d-812c-3995eb090804_M_2', 'web');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('188e6540ae54dcc157e2118d5d0a7aaaea8d7295c5398b8d75f6ecd7d4490b16', 'admin', 'Get your team the technical skills they need to stay ahead. Whether you require group-discounted online courses, custom instructor-led sessions, or hands-on workshops at our facility or yours, SEI delivers training solutions tailored to your organization&#8217;s goals. Trusted by top EPCs, manufacturers, and government agencies worldwide to build safer, more efficient workforces.

LEARN MORE                 &times;

###

REAL PEOPLE.

REAL TRAINING.

IMMEDIATE IMPACT.

REAL PEOPLE.

REAL TRAINING.

IMMEDIATE IMPACT.

Right now, solar is at a crossroads&#8230;

Right now, solar is at a crossroads&#8230;

Federal pullback slashed America&#8217;s renewables forecast in half. Yet energy demand is exploding. Solar is now cheaper than natural gas and faster to deploy than ever before.

The technology is ready. The market exists. What&#8217;s missing?  The solar warriors to install it .

Here&#8217;s where you can help: we&#8217;re funding scholarships for technicians ready to step into this moment. Your gift determines whether they get trained this year or wait another.

FUND A SOLAR WARRIOR                 &times;

###

#  A NEW INITIATIVE

#  A NEW INITIATIVE

Empowering Communities. Honoring a Legacy. Expanding Global Access to Solar Energy Education.

Empowering Communities. Honoring a Legacy. Expanding Global Access to Solar Energy Education.', 'v1', '2026-08-19 13:12:48', '["real-people","a-new-initiative","SEI","LEARN","MORE","REAL","PEOPLE","IMPACT"]', 'Prose Standard', '📝 REAL PEOPLE.', NULL, '[]', 'Get your team the technical skills they need to stay ahead', 6, 'high', 'web_o8u7CYfuMtZ5', 'b0eed475aed5286793db8b29f1fcb8c26cdcd79287a24b015512ef86f3e22ec2', 'text-embedding-3-small', 'ai', 'medium', 'e8915993-0b28-4e8d-812c-3995eb090804_L_1', 'web');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('b33dc6ea8f2842e263e5893ae94b8dbf21449342c91b8a7f3b3feff6a1e7056a', 'admin', 'Get your team the technical skills they need to stay ahead.

Whether you require group-discounted online courses, custom instructor-led sessions, or hands-on workshops at our facility or yours, SEI delivers training solutions tailored to your organization&#8217;s goals.

Trusted by top EPCs, manufacturers, and government agencies worldwide to build safer, more efficient workforces.

LEARN MORE                 &times;

###

REAL PEOPLE.', 'v1', '2026-08-19 13:12:48', '["career-launch-in-solar-industry","real-people","SEI","LEARN","MORE","REAL","PEOPLE","career-launch"]', 'Prose Standard', '🔍 Career Launch in Solar Industry', NULL, '[]', 'Get your team the technical skills they need to stay ahead', 7, 'high', 'web_o8u7CYfuMtZ5', '1a87a4229c9ab88e499f47731b29047722864afd70de6842b85129909e2405b2', 'text-embedding-3-small', 'ai', 'small', 'e8915993-0b28-4e8d-812c-3995eb090804_M_7', 'web');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('427f0ff7e12f6141cd640cbcab600b0a9b5017bffc61ef69348e1ab63c2669e6', 'admin', 'REAL TRAINING.

IMMEDIATE IMPACT.

REAL PEOPLE.

REAL TRAINING.

IMMEDIATE IMPACT.

Right now, solar is at a crossroads&#8230;

Right now, solar is at a crossroads&#8230;

Federal pullback slashed America&#8217;s renewables forecast in half.

Yet energy demand is exploding.

Solar is now cheaper than natural gas and faster to deploy than ever before.

The technology is ready.

The market exists.

What&#8217;s missing?', 'v1', '2026-08-19 13:12:48', '["career-launch-in-solar-industry","REAL","IMPACT","PEOPLE","career-launch","solar-industry","prose-standard"]', 'Prose Standard', '🔍 Career Launch in Solar Industry', NULL, '[]', 'REAL TRAINING', 8, 'high', 'web_o8u7CYfuMtZ5', '058b0bd6a00bd922ea7d5b586f7e647c3a6eb55e7c1a4bb1cf38c87aced7356d', 'text-embedding-3-small', 'ai', 'small', 'e8915993-0b28-4e8d-812c-3995eb090804_M_7', 'web');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('ae4a32c2c734796d7df72e41ff9c8faf03152115d57b4f5768dec06e6c447f81', 'admin', 'The solar warriors to install it .

Here&#8217;s where you can help: we&#8217;re funding scholarships for technicians ready to step into this moment.

Your gift determines whether they get trained this year or wait another.

FUND A SOLAR WARRIOR                 &times;

###

#  A NEW INITIATIVE

#  A NEW INITIATIVE

Empowering Communities.

Honoring a Legacy.

Expanding Global Access to Solar Energy Education.

Empowering Communities.', 'v1', '2026-08-19 13:12:48', '["career-launch-in-solar-industry","a-new-initiative","FUND","SOLAR","career-launch","solar-industry","empowering-communities","prose-standard"]', 'Prose Standard', '🔍 Career Launch in Solar Industry', NULL, '[]', 'The solar warriors to install it ', 9, 'high', 'web_o8u7CYfuMtZ5', '47a5ae16eef6e07f3fdba226dec6fec1f8ea726ad42d2728b450dd1ac8d6e5f5', 'text-embedding-3-small', 'ai', 'small', 'e8915993-0b28-4e8d-812c-3995eb090804_M_7', 'web');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('25800133b23184a33cd13b755b4938af3a139aac8a4e18833c2f2a50c4dce89f', 'admin', 'Honoring a Legacy.

Expanding Global Access to Solar Energy Education.', 'v1', '2026-08-19 13:12:48', '["career-launch-in-solar-industry","career-launch","solar-industry","expanding-global-access","prose-standard"]', 'Prose Standard', '🔍 Career Launch in Solar Industry', NULL, '[]', 'Honoring a Legacy', 10, 'high', 'web_o8u7CYfuMtZ5', '20a3444bbeb56ad25328b270d00fee0c982e80133bdec91bb8a3bd083f3fd6b1', 'text-embedding-3-small', 'ai', 'small', 'e8915993-0b28-4e8d-812c-3995eb090804_M_7', 'web');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('b547971906b0a2553dbcb471ebf6bad5373c0498ee1c8b00b7a0092c1ccdd092', 'admin', 'The Johnny Weiss Solar Energy For All Initiative   continues the legacy of Solar Energy International&#8217;s co-founder Johnny Weiss, who believed renewable energy training should be accessible to everyone. While SEI has trained over 150,000 people in 100+ countries since 1991, an estimated 775 million people still lack electricity access, with many still experiencing unreliable power for daily needs. This initiative specifically targets underserved communities where energy access is literally a matter of life and death, bringing solar education and training to those who need it most as part of SEI&#8217;s broader mission to address the persistent global energy gap.

LEARN MORE                 &times;

###', 'v1', '2026-08-19 13:12:48', '["SEI","LEARN","MORE","the-johnny-weiss-solar-energy","for-all-initiative","solar-energy-international","prose-standard"]', 'Prose Standard', '📝 Medium Chunk', NULL, '[]', 'The Johnny Weiss Solar Energy For All Initiative   continues the legacy of Solar Energy International&#8217;s co-founder Johnny Weiss, who believed renewable energy training should be accessible to ev', 11, 'high', 'web_o8u7CYfuMtZ5', '0c851a91f4fff4761267c94318eecc1e364a1fed408cdafefc460955f168c0d5', 'text-embedding-3-small', 'ai', 'medium', 'e8915993-0b28-4e8d-812c-3995eb090804_L_1', 'web');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('de57837a47d5a9e86445f231ef149aa5476614369f4adbec38aead91d65a5c07', 'admin', 'The Johnny Weiss Solar Energy For All Initiative   continues the legacy of Solar Energy International&#8217;s co-founder Johnny Weiss, who believed renewable energy training should be accessible to everyone.

While SEI has trained over 150,000 people in 100+ countries since 1991, an estimated 775 million people still lack electricity access, with many still experiencing unreliable power for daily needs.', 'v1', '2026-08-19 13:12:48', '["workforce-training-solutions","SEI","the-johnny-weiss-solar-energy","for-all-initiative","prose-standard"]', 'Prose Standard', '🔍 Workforce Training Solutions', NULL, '[]', 'The Johnny Weiss Solar Energy For All Initiative   continues the legacy of Solar Energy International&#8217;s co-founder Johnny Weiss, who believed renewable energy training should be accessible to ev', 12, 'high', 'web_o8u7CYfuMtZ5', 'd0e3a7ea554f3dc9e1b6f590ecdf8f75c015c2773f8ca0f8c5f842220cafe947', 'text-embedding-3-small', 'ai', 'small', 'e8915993-0b28-4e8d-812c-3995eb090804_M_12', 'web');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('091aa70af5ee7a6199410af0860e499e58bca09d9c525cdd617cd3eb25dea057', 'admin', 'This initiative specifically targets underserved communities where energy access is literally a matter of life and death, bringing solar education and training to those who need it most as part of SEI&#8217;s broader mission to address the persistent global energy gap.

LEARN MORE                 &times;

###', 'v1', '2026-08-19 13:12:48', '["workforce-training-solutions","SEI","LEARN","MORE","prose-standard"]', 'Prose Standard', '🔍 Workforce Training Solutions', NULL, '[]', 'This initiative specifically targets underserved communities where energy access is literally a matter of life and death, bringing solar education and training to those who need it most as part of SEI', 13, 'high', 'web_o8u7CYfuMtZ5', '24860b1895a99b307833e5dc663d380c4842952961894c44d55fc7ecb10c5818', 'text-embedding-3-small', 'ai', 'small', 'e8915993-0b28-4e8d-812c-3995eb090804_M_12', 'web');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('f1d918afe0b84e8ec53d55e3fa07e72c55359378999e16d789c623fc95d036b9', 'admin', 'NEW ONLINE COURSE              NEW ONLINE COURSE

Introduction to O&M for Large-scale PV Systems for Employers

As solar infrastructure ages, the demand for Operations and Maintenance (O&M) technicians is on the rise, with a 28% increase in solar O&M jobs from 2022 to 2023. To meet this growing need, SEI is offering a new online course designed to provide cost-effective training for employers and training managers, equipping participants with job-ready skills and standardized knowledge while emphasizing site safety.    Learn more

As solar infrastructure ages, the demand for Operations and Maintenance (O&M) technicians is on the rise, with a 28% increase in solar O&M jobs from 2022 to 2023. To meet this growing need, SEI is offering a new online course designed to provide cost-effective training for employers and training managers, equipping participants with job-ready skills and standardized knowledge while emphasizing site safety.

## Improve Safety

Foster proper safety protocol compliance to minimize workplace accidents.

## Save Time & Cost

Begin training your team immediately with our ready-to-use training.

## Increase Efficiency

Empower employees to perform their jobs more effectively and efficiently.

LEARN MORE            LEARN MORE

## Start with our free online training today!

START NOW

##  EXPLORE ALL TRAINING

Master any aspect of solar quickly – even if you&#8217;re just starting out.

##  EXPLORE ALL TRAINING

Master any aspect of solar quickly – even if you&#8217;re just starting out.

Online Training                                Hands-on Labs                                Custom Training

## Let us guide you on your solar energy journey!

Not sure where to start? Need more information about our training programs? Share your details below and our team will connect with you.

Request Training Info

Name  *

First Name

Last Name

Email  *', 'v1', '2026-08-19 13:12:48', '["improve-safety","save-time-cost","increase-efficiency","start-with-our-free-online-training-today","explore-all-training","let-us-guide-you-on-your-solar-energy-journey","ONLINE","COURSE"]', 'Prose Standard', '📄 Improve Safety', NULL, '[]', 'NEW ONLINE COURSE              NEW ONLINE COURSE

Introduction to O&M for Large-scale PV Systems for Employers

As solar infrastructure ages, the demand for Operations and Maintenance (O&M) technician', 14, 'high', 'web_o8u7CYfuMtZ5', '7420055edec9550acb8a05bf7fa3f9e1e6e2395cb9885e29be32a2ed51b34486', 'text-embedding-3-small', 'ai', 'large', NULL, 'web');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('d7084a42ba119d41756708a8be7a2a2a593d19d3f65cb6c295ba175b45a451c0', 'admin', 'NEW ONLINE COURSE              NEW ONLINE COURSE

Introduction to O&M for Large-scale PV Systems for Employers

As solar infrastructure ages, the demand for Operations and Maintenance (O&M) technicians is on the rise, with a 28% increase in solar O&M jobs from 2022 to 2023. To meet this growing need, SEI is offering a new online course designed to provide cost-effective training for employers and training managers, equipping participants with job-ready skills and standardized knowledge while emphasizing site safety.    Learn more

As solar infrastructure ages, the demand for Operations and Maintenance (O&M) technicians is on the rise, with a 28% increase in solar O&M jobs from 2022 to 2023. To meet this growing need, SEI is offering a new online course designed to provide cost-effective training for employers and training managers, equipping participants with job-ready skills and standardized knowledge while emphasizing site safety.

## Improve Safety

Foster proper safety protocol compliance to minimize workplace accidents.

## Save Time & Cost

Begin training your team immediately with our ready-to-use training.

## Increase Efficiency

Empower employees to perform their jobs more effectively and efficiently.

LEARN MORE            LEARN MORE

## Start with our free online training today!

START NOW

##  EXPLORE ALL TRAINING', 'v1', '2026-08-19 13:12:48', '["improve-safety","save-time-cost","increase-efficiency","start-with-our-free-online-training-today","explore-all-training","ONLINE","COURSE","PV"]', 'Prose Standard', '📝 Improve Safety', NULL, '[]', 'NEW ONLINE COURSE              NEW ONLINE COURSE

Introduction to O&M for Large-scale PV Systems for Employers

As solar infrastructure ages, the demand for Operations and Maintenance (O&M) technician', 15, 'high', 'web_o8u7CYfuMtZ5', '30115bdc9090f67b4c63f212a1cdd05daeb295b70d185662644249438ea6f332', 'text-embedding-3-small', 'ai', 'medium', 'e8915993-0b28-4e8d-812c-3995eb090804_L_15', 'web');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('1e6057f82bef20b324d8be8fa7ee5c9e63e629e1b8034f700cbe8f2447420e22', 'admin', 'NEW ONLINE COURSE              NEW ONLINE COURSE

Introduction to O&M for Large-scale PV Systems for Employers

As solar infrastructure ages, the demand for Operations and Maintenance (O&M) technicians is on the rise, with a 28% increase in solar O&M jobs from 2022 to 2023.', 'v1', '2026-08-19 13:12:48', '["introduction-to-om-training","ONLINE","COURSE","PV","operations-and-maintenance","prose-standard"]', 'Prose Standard', '🔍 Introduction to O&M Training', NULL, '[]', 'NEW ONLINE COURSE              NEW ONLINE COURSE

Introduction to O&M for Large-scale PV Systems for Employers

As solar infrastructure ages, the demand for Operations and Maintenance (O&M) technician', 16, 'high', 'web_o8u7CYfuMtZ5', '984c5133b6000cbff66896fbcfe4a0b6b13bb0954e75cc6a995402b4e330701e', 'text-embedding-3-small', 'ai', 'small', 'e8915993-0b28-4e8d-812c-3995eb090804_M_16', 'web');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('cfee43f2a56dc999fd8818ba239681688602295e02a0d3a5b2cb20d1b6270d0f', 'admin', 'To meet this growing need, SEI is offering a new online course designed to provide cost-effective training for employers and training managers, equipping participants with job-ready skills and standardized knowledge while emphasizing site safety.

Learn more

As solar infrastructure ages, the demand for Operations and Maintenance (O&M) technicians is on the rise, with a 28% increase in solar O&M jobs from 2022 to 2023.', 'v1', '2026-08-19 13:12:48', '["introduction-to-om-training","SEI","operations-and-maintenance","prose-standard"]', 'Prose Standard', '🔍 Introduction to O&M Training', NULL, '[]', 'To meet this growing need, SEI is offering a new online course designed to provide cost-effective training for employers and training managers, equipping participants with job-ready skills and standar', 17, 'high', 'web_o8u7CYfuMtZ5', '7e59f40b62a095a237e9cd5d41027164c7e7442d6eed15766e8b287e2859138a', 'text-embedding-3-small', 'ai', 'small', 'e8915993-0b28-4e8d-812c-3995eb090804_M_16', 'web');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('5b3f79fdf15df357be101bc30b82bc148839b50bbee30755583ac9e39be5d6e0', 'admin', 'To meet this growing need, SEI is offering a new online course designed to provide cost-effective training for employers and training managers, equipping participants with job-ready skills and standardized knowledge while emphasizing site safety.

## Improve Safety

Foster proper safety protocol compliance to minimize workplace accidents.

## Save Time & Cost

Begin training your team immediately with our ready-to-use training.', 'v1', '2026-08-19 13:12:48', '["introduction-to-om-training","improve-safety","save-time-cost","SEI","improve-safety-foster","save-time","cost-begin","prose-standard"]', 'Prose Standard', '🔍 Introduction to O&M Training', NULL, '[]', 'To meet this growing need, SEI is offering a new online course designed to provide cost-effective training for employers and training managers, equipping participants with job-ready skills and standar', 18, 'high', 'web_o8u7CYfuMtZ5', '760a5bd8e87db617be38de8b5729b02ffdaf6420b83b9c96a845464d62341e23', 'text-embedding-3-small', 'ai', 'small', 'e8915993-0b28-4e8d-812c-3995eb090804_M_16', 'web');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('dc7b8272062d843ff958f90d876c3986b96eae63040a96e66fe51adb09a49b7f', 'admin', '## Increase Efficiency

Empower employees to perform their jobs more effectively and efficiently.

LEARN MORE            LEARN MORE

## Start with our free online training today!

START NOW

##  EXPLORE ALL TRAINING', 'v1', '2026-08-19 13:12:48', '["introduction-to-om-training","start-with-our-free-online-training-today","explore-all-training","LEARN","MORE","START","increase-efficiency-empower","prose-standard"]', 'Prose Standard', '🔍 Introduction to O&M Training', NULL, '[]', '## Increase Efficiency

Empower employees to perform their jobs more effectively and efficiently', 19, 'high', 'web_o8u7CYfuMtZ5', 'd245665208e8eaee4509c3d56902cfbf826bb9a660fd4754b0ba59ac5c44a3d8', 'text-embedding-3-small', 'ai', 'small', 'e8915993-0b28-4e8d-812c-3995eb090804_M_16', 'web');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('69fda7801728fe7233428119b3ff96ea30f04d0e2aac5d3ac37c7f1af3ba857e', 'admin', 'Master any aspect of solar quickly – even if you&#8217;re just starting out.

##  EXPLORE ALL TRAINING

Master any aspect of solar quickly – even if you&#8217;re just starting out.

Online Training                                Hands-on Labs                                Custom Training

## Let us guide you on your solar energy journey!

Not sure where to start? Need more information about our training programs? Share your details below and our team will connect with you.

Request Training Info

Name  *

First Name

Last Name

Email  *', 'v1', '2026-08-19 13:12:48', '["explore-all-training","let-us-guide-you-on-your-solar-energy-journey","request-training-info-name","first-name-last-name-email","prose-standard"]', 'Prose Standard', '📝 EXPLORE ALL TRAINING', NULL, '[]', 'Master any aspect of solar quickly – even if you&#8217;re just starting out', 20, 'high', 'web_o8u7CYfuMtZ5', '06acf8c79261746127454091eddf84b08567156c8c08d65038ab523e4d3984cb', 'text-embedding-3-small', 'ai', 'medium', 'e8915993-0b28-4e8d-812c-3995eb090804_L_15', 'web');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('e3ec4fd485a1ed335d902f7757f47d3ff966198cf8526c2477463792727631e5', 'admin', 'Master any aspect of solar quickly – even if you&#8217;re just starting out.

##  EXPLORE ALL TRAINING

Master any aspect of solar quickly – even if you&#8217;re just starting out.

Online Training                                Hands-on Labs                                Custom Training

## Let us guide you on your solar energy journey!

Not sure where to start?

Need more information about our training programs?', 'v1', '2026-08-19 13:12:48', '["safety-protocol-compliance","explore-all-training","let-us-guide-you-on-your-solar-energy-journey","prose-standard"]', 'Prose Standard', '🔍 Safety Protocol Compliance', NULL, '[]', 'Master any aspect of solar quickly – even if you&#8217;re just starting out', 21, 'high', 'web_o8u7CYfuMtZ5', 'a4f32f85637fdd27ed4f218c832d02b76ba72f79159cd96a85db5873de9eb05e', 'text-embedding-3-small', 'ai', 'small', 'e8915993-0b28-4e8d-812c-3995eb090804_M_21', 'web');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('7e9453ccb774a12ebe4724f141cd9e1aa3a536987b5a821cf64014399c58bc19', 'admin', 'Share your details below and our team will connect with you.

Request Training Info

Name  *

First Name

Last Name

Email  *', 'v1', '2026-08-19 13:12:48', '["safety-protocol-compliance","request-training-info-name","first-name-last-name-email","prose-standard"]', 'Prose Standard', '🔍 Safety Protocol Compliance', NULL, '[]', 'Share your details below and our team will connect with you', 22, 'high', 'web_o8u7CYfuMtZ5', '9e334f0786838e866a26d6f031472e6c36089f4fdc75276074f07eb374832887', 'text-embedding-3-small', 'ai', 'small', 'e8915993-0b28-4e8d-812c-3995eb090804_M_21', 'web');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('b4c647aa0c0e3f5b24dcd7eefc1b5d3d5dd0042c64653708f68bbd9e89c930ec', 'admin', '-  Country  *      Country  Afghanistan  Albania  Algeria  American Samoa  Andorra  Angola  Anguilla  Antarctica  Antigua and Barbuda  Argentina  Armenia  Aruba  Australia  Austria  Azerbaijan  Bahamas  Bahrain  Bangladesh  Barbados  Belarus  Belgium  Belize  Benin  Bermuda  Bhutan  Bolivia  Bonaire, Sint Eustatius and Saba  Bosnia and Herzegovina  Botswana  Bouvet Island  Brazil  British Indian Ocean Territory  Brunei Darussalam  Bulgaria  Burkina Faso  Burundi  Cambodia  Cameroon  Canada  Cape Verde  Cayman Islands  Central African Republic  Chad  Chile  China  Christmas Island  Cocos Islands  Colombia  Comoros  Congo, Democratic Republic of the  Congo, Republic of the  Cook Islands  Costa Rica  Croatia  Cuba  Curaçao  Cyprus  Czech Republic  Côte d&#039;Ivoire  Denmark  Djibouti  Dominica  Dominican Republic  Ecuador  Egypt  El Salvador  Equatorial Guinea  Eritrea  Estonia  Eswatini (Swaziland)  Ethiopia  Falkland Islands  Faroe Islands  Fiji  Finland  France  French Guiana  French Polynesia  French Southern Territories  Gabon  Gambia  Georgia  Germany  Ghana  Gibraltar  Greece  Greenland  Grenada  Guadeloupe  Guam  Guatemala  Guernsey  Guinea  Guinea-Bissau  Guyana  Haiti  Heard and McDonald Islands  Holy See  Honduras  Hong Kong  Hungary  Iceland  India  Indonesia  Iran  Iraq  Ireland  Isle of Man  Israel  Italy  Jamaica  Japan  Jersey  Jordan  Kazakhstan  Kenya  Kiribati  Kuwait  Kyrgyzstan  Lao People&#039;s Democratic Republic  Latvia  Lebanon  Lesotho  Liberia  Libya  Liechtenstein  Lithuania  Luxembourg  Macau  Macedonia  Madagascar  Malawi  Malaysia  Maldives  Mali  Malta  Marshall Islands  Martinique  Mauritania  Mauritius  Mayotte  Mexico  Micronesia  Moldova  Monaco  Mongolia  Montenegro  Montserrat  Morocco  Mozambique  Myanmar  Namibia  Nauru  Nepal  Netherlands  New Caledonia  New Zealand  Nicaragua  Niger  Nigeria  Niue  Norfolk Island  North Korea  Northern Mariana Islands  Norway  Oman  Pakistan  Palau  Palestine, State of  Panama  Papua New Guinea  Paraguay  Peru  Philippines  Pitcairn  Poland  Portugal  Puerto Rico  Qatar  Romania  Russia  Rwanda  Réunion  Saint Barthélemy  Saint Helena  Saint Kitts and Nevis  Saint Lucia  Saint Martin  Saint Pierre and Miquelon  Saint Vincent and the Grenadines  Samoa  San Marino  Sao Tome and Principe  Saudi Arabia  Senegal  Serbia  Seychelles  Sierra Leone  Singapore  Sint Maarten  Slovakia  Slovenia  Solomon Islands  Somalia  South Africa  South Georgia  South Korea  South Sudan  Spain  Sri Lanka  Sudan  Suriname  Svalbard and Jan Mayen Islands  Sweden  Switzerland  Syria  Taiwan  Tajikistan  Tanzania  Thailand  Timor-Leste  Togo  Tokelau  Tonga  Trinidad and Tobago  Tunisia  Turkey  Turkmenistan  Turks and Caicos Islands  Tuvalu  US Minor Outlying Islands  Uganda  Ukraine  United Arab Emirates  United Kingdom  United States  Uruguay  Uzbekistan  Vanuatu  Venezuela  Vietnam  Virgin Islands, British  Virgin Islands, U.S.  Wallis and Futuna  Western Sahara  Yemen  Zambia  Zimbabwe  Åland Islands
-  I am interested in solar training:  *      I am interested in solar training...  For myself only  For a small team (2-10 people)  For a large team (11+ people)  For my school/non-profit organization  For a government or community program  Other
-  What is your solar experience level?  *      What is your solar experience level?  No prior solar or related technical experience  Experienced in another trade/technical field  1-3 years working in the solar industry  3+ years working in the solar industry  Other/not applicable
-  What is the primary reason for your interest in solar training?  *      What is the primary reason for your interest in solar training?  Starting a new career in solar  Transitioning from another field to solar  Career advancement in solar  Maintaining professional certifications  Developing curriculum or training programs  Other/not applicable
-  CAPTCHA', 'v1', '2026-08-19 13:12:48', '["US","country-afghanistan-albania-algeria-american","samoa-andorra-angola-anguilla-antarctica","antigua-and-barbuda-argentina-armenia-aruba","prose-standard"]', 'Prose Standard', '📄 Large Chunk', NULL, '[]', '-  Country  *      Country  Afghanistan  Albania  Algeria  American Samoa  Andorra  Angola  Anguilla  Antarctica  Antigua and Barbuda  Argentina  Armenia  Aruba  Australia  Austria  Azerbaijan  Bahama', 23, 'high', 'web_o8u7CYfuMtZ5', 'db15262a05dcba63b208ce071381cccf80cca9259ef53d030487fadec5aacc51', 'text-embedding-3-small', 'ai', 'large', NULL, 'web');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('5e3a23f5fe2695ccf8128ca11ca28b39f7a9017fd55e7bb30b296562fe7ef0d9', 'admin', '-  Country  *      Country  Afghanistan  Albania  Algeria  American Samoa  Andorra  Angola  Anguilla  Antarctica  Antigua and Barbuda  Argentina  Armenia  Aruba  Australia  Austria  Azerbaijan  Bahamas  Bahrain  Bangladesh  Barbados  Belarus  Belgium  Belize  Benin  Bermuda  Bhutan  Bolivia  Bonaire, Sint Eustatius and Saba  Bosnia and Herzegovina  Botswana  Bouvet Island  Brazil  British Indian Ocean Territory  Brunei Darussalam  Bulgaria  Burkina Faso  Burundi  Cambodia  Cameroon  Canada  Cape Verde  Cayman Islands  Central African Republic  Chad  Chile  China  Christmas Island  Cocos Islands  Colombia  Comoros  Congo, Democratic Republic of the  Congo, Republic of the  Cook Islands  Costa Rica  Croatia  Cuba  Curaçao  Cyprus  Czech Republic  Côte d&#039;Ivoire  Denmark  Djibouti  Dominica  Dominican Republic  Ecuador  Egypt  El Salvador  Equatorial Guinea  Eritrea  Estonia  Eswatini (Swaziland)  Ethiopia  Falkland Islands  Faroe Islands  Fiji  Finland  France  French Guiana  French Polynesia  French Southern Territories  Gabon  Gambia  Georgia  Germany  Ghana  Gibraltar  Greece  Greenland  Grenada  Guadeloupe  Guam  Guatemala  Guernsey  Guinea  Guinea-Bissau  Guyana  Haiti  Heard and McDonald Islands  Holy See  Honduras  Hong Kong  Hungary  Iceland  India  Indonesia  Iran  Iraq  Ireland  Isle of Man  Israel  Italy  Jamaica  Japan  Jersey  Jordan  Kazakhstan  Kenya  Kiribati  Kuwait  Kyrgyzstan  Lao People&#039;s Democratic Republic  Latvia  Lebanon  Lesotho  Liberia  Libya  Liechtenstein  Lithuania  Luxembourg  Macau  Macedonia  Madagascar  Malawi  Malaysia  Maldives  Mali  Malta  Marshall Islands  Martinique  Mauritania  Mauritius  Mayotte  Mexico  Micronesia  Moldova  Monaco  Mongolia  Montenegro  Montserrat  Morocco  Mozambique  Myanmar  Namibia  Nauru  Nepal  Netherlands  New Caledonia  New Zealand  Nicaragua  Niger  Nigeria  Niue  Norfolk Island  North Korea  Northern Mariana Islands  Norway  Oman  Pakistan  Palau  Palestine, State of  Panama  Papua New Guinea  Paraguay  Peru  Philippines  Pitcairn  Poland  Portugal  Puerto Rico  Qatar  Romania  Russia  Rwanda  Réunion  Saint Barthélemy  Saint Helena  Saint Kitts and Nevis  Saint Lucia  Saint Martin  Saint Pierre and Miquelon  Saint Vincent and the Grenadines  Samoa  San Marino  Sao Tome and Principe  Saudi Arabia  Senegal  Serbia  Seychelles  Sierra Leone  Singapore  Sint Maarten  Slovakia  Slovenia  Solomon Islands  Somalia  South Africa  South Georgia  South Korea  South Sudan  Spain  Sri Lanka  Sudan  Suriname  Svalbard and Jan Mayen Islands  Sweden  Switzerland  Syria  Taiwan  Tajikistan  Tanzania  Thailand  Timor-Leste  Togo  Tokelau  Tonga  Trinidad and Tobago  Tunisia  Turkey  Turkmenistan  Turks and Caicos Islands  Tuvalu  US Minor Outlying Islands  Uganda  Ukraine  United Arab Emirates  United Kingdom  United States  Uruguay  Uzbekistan  Vanuatu  Venezuela  Vietnam  Virgin Islands, British  Virgin Islands, U.S.  Wallis and Futuna  Western Sahara  Yemen  Zambia  Zimbabwe  Åland Islands
-  I am interested in solar training:  *      I am interested in solar training...  For myself only  For a small team (2-10 people)  For a large team (11+ people)  For my school/non-profit organization  For a government or community program  Other
-  What is your solar experience level?  *      What is your solar experience level?  No prior solar or related technical experience  Experienced in another trade/technical field  1-3 years working in the solar industry  3+ years working in the solar industry  Other/not applicable
-  What is the primary reason for your interest in solar training?  *      What is the primary reason for your interest in solar training?  Starting a new career in solar  Transitioning from another field to solar  Career advancement in solar  Maintaining professional certifications  Developing curriculum or training programs  Other/not applicable
-  CAPTCHA', 'v1', '2026-08-19 13:12:48', '["US","country-afghanistan-albania-algeria-american","samoa-andorra-angola-anguilla-antarctica","antigua-and-barbuda-argentina-armenia-aruba","prose-standard"]', 'Prose Standard', '📝 Medium Chunk', NULL, '[]', '-  Country  *      Country  Afghanistan  Albania  Algeria  American Samoa  Andorra  Angola  Anguilla  Antarctica  Antigua and Barbuda  Argentina  Armenia  Aruba  Australia  Austria  Azerbaijan  Bahama', 24, 'high', 'web_o8u7CYfuMtZ5', 'db15262a05dcba63b208ce071381cccf80cca9259ef53d030487fadec5aacc51', 'text-embedding-3-small', 'ai', 'medium', 'e8915993-0b28-4e8d-812c-3995eb090804_L_24', 'web');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('91f63358263ef17db230fe38c1a4b958d2f8318dc4c2807b7721e00a30735df4', 'admin', '-  Country  *      Country  Afghanistan  Albania  Algeria  American Samoa  Andorra  Angola  Anguilla  Antarctica  Antigua and Barbuda  Argentina  Armenia  Aruba  Australia  Austria  Azerbaijan  Bahamas  Bahrain  Bangladesh  Barbados  Belarus  Belgium  Belize  Benin  Bermuda  Bhutan  Bolivia  Bonaire, Sint Eustatius and Saba  Bosnia and Herzegovina  Botswana  Bouvet Island  Brazil  British Indian Ocean Territory  Brunei Darussalam  Bulgaria  Burkina Faso  Burundi  Cambodia  Cameroon  Canada  Cape Verde  Cayman Islands  Central African Republic  Chad  Chile  China  Christmas Island  Cocos Islands  Colombia  Comoros  Congo, Democratic Republic of the  Congo, Republic of the  Cook Islands  Costa Rica  Croatia  Cuba  Curaçao  Cyprus  Czech Republic  Côte d&#039;Ivoire  Denmark  Djibouti  Dominica  Dominican Republic  Ecuador  Egypt  El Salvador  Equatorial Guinea  Eritrea  Estonia  Eswatini (Swaziland)  Ethiopia  Falkland Islands  Faroe Islands  Fiji  Finland  France  French Guiana  French Polynesia  French Southern Territories  Gabon  Gambia  Georgia  Germany  Ghana  Gibraltar  Greece  Greenland  Grenada  Guadeloupe  Guam  Guatemala  Guernsey  Guinea  Guinea-Bissau  Guyana  Haiti  Heard and McDonald Islands  Holy See  Honduras  Hong Kong  Hungary  Iceland  India  Indonesia  Iran  Iraq  Ireland  Isle of Man  Israel  Italy  Jamaica  Japan  Jersey  Jordan  Kazakhstan  Kenya  Kiribati  Kuwait  Kyrgyzstan  Lao People&#039;s Democratic Republic  Latvia  Lebanon  Lesotho  Liberia  Libya  Liechtenstein  Lithuania  Luxembourg  Macau  Macedonia  Madagascar  Malawi  Malaysia  Maldives  Mali  Malta  Marshall Islands  Martinique  Mauritania  Mauritius  Mayotte  Mexico  Micronesia  Moldova  Monaco  Mongolia  Montenegro  Montserrat  Morocco  Mozambique  Myanmar  Namibia  Nauru  Nepal  Netherlands  New Caledonia  New Zealand  Nicaragua  Niger  Nigeria  Niue  Norfolk Island  North Korea  Northern Mariana Islands  Norway  Oman  Pakistan  Palau  Palestine, State of  Panama  Papua New Guinea  Paraguay  Peru  Philippines  Pitcairn  Poland  Portugal  Puerto Rico  Qatar  Romania  Russia  Rwanda  Réunion  Saint Barthélemy  Saint Helena  Saint Kitts and Nevis  Saint Lucia  Saint Martin  Saint Pierre and Miquelon  Saint Vincent and the Grenadines  Samoa  San Marino  Sao Tome and Principe  Saudi Arabia  Senegal  Serbia  Seychelles  Sierra Leone  Singapore  Sint Maarten  Slovakia  Slovenia  Solomon Islands  Somalia  South Africa  South Georgia  South Korea  South Sudan  Spain  Sri Lanka  Sudan  Suriname  Svalbard and Jan Mayen Islands  Sweden  Switzerland  Syria  Taiwan  Tajikistan  Tanzania  Thailand  Timor-Leste  Togo  Tokelau  Tonga  Trinidad and Tobago  Tunisia  Turkey  Turkmenistan  Turks and Caicos Islands  Tuvalu  US Minor Outlying Islands  Uganda  Ukraine  United Arab Emirates  United Kingdom  United States  Uruguay  Uzbekistan  Vanuatu  Venezuela  Vietnam  Virgin Islands, British  Virgin Islands, U.S.  Wallis and Futuna  Western Sahara  Yemen  Zambia  Zimbabwe  Åland Islands
-  I am interested in solar training:  *      I am interested in solar training...', 'v1', '2026-08-19 13:12:48', '["list-of-countries","US","country-afghanistan-albania-algeria-american","samoa-andorra-angola-anguilla-antarctica","antigua-and-barbuda-argentina-armenia-aruba","prose-standard"]', 'Prose Standard', '🔍 List of Countries', NULL, '[]', '-  Country  *      Country  Afghanistan  Albania  Algeria  American Samoa  Andorra  Angola  Anguilla  Antarctica  Antigua and Barbuda  Argentina  Armenia  Aruba  Australia  Austria  Azerbaijan  Bahama', 25, 'high', 'web_o8u7CYfuMtZ5', '3612edc76b2b4fdfc3c92adce0f76112c95d51bd462c4e665b49a2777d41aaf1', 'text-embedding-3-small', 'ai', 'small', 'e8915993-0b28-4e8d-812c-3995eb090804_M_25', 'web');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('a10e1c771997e8fef395c12fc274a00ef06019bece1471da36f5df52d26fd52e', 'admin', 'For myself only  For a small team (2-10 people)  For a large team (11+ people)  For my school/non-profit organization  For a government or community program  Other
-  What is your solar experience level?  *      What is your solar experience level?', 'v1', '2026-08-19 13:12:48', '["list-of-countries","prose-standard"]', 'Prose Standard', '🔍 List of Countries', NULL, '[]', 'For myself only  For a small team (2-10 people)  For a large team (11+ people)  For my school/non-profit organization  For a government or community program  Other
-  What is your solar experience lev', 26, 'high', 'web_o8u7CYfuMtZ5', 'c71546c196917bec2f6a53a6230b43562e5f7840752ef175c8954e5a7d992bb7', 'text-embedding-3-small', 'ai', 'small', 'e8915993-0b28-4e8d-812c-3995eb090804_M_25', 'web');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('e12e45a7aa47d127f2b87733b3bffcbbe9fed8b45380ac7cec0e5c45ddd9474a', 'admin', 'No prior solar or related technical experience  Experienced in another trade/technical field  1-3 years working in the solar industry  3+ years working in the solar industry  Other/not applicable
-  What is the primary reason for your interest in solar training?  *      What is the primary reason for your interest in solar training?', 'v1', '2026-08-19 13:12:48', '["list-of-countries","prose-standard"]', 'Prose Standard', '🔍 List of Countries', NULL, '[]', 'No prior solar or related technical experience  Experienced in another trade/technical field  1-3 years working in the solar industry  3+ years working in the solar industry  Other/not applicable
-  W', 27, 'high', 'web_o8u7CYfuMtZ5', '307abe0b2ca3507c197587ac9c3ff4ec16bffd41ff1df1cb9f31ad5ab1e50c82', 'text-embedding-3-small', 'ai', 'small', 'e8915993-0b28-4e8d-812c-3995eb090804_M_25', 'web');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('cbdb1da8347c12f364523399ac77ade4cfc29543c706babf2e0f7c84de3838a6', 'admin', 'Starting a new career in solar  Transitioning from another field to solar  Career advancement in solar  Maintaining professional certifications  Developing curriculum or training programs  Other/not applicable
-  CAPTCHA', 'v1', '2026-08-19 13:12:48', '["list-of-countries","prose-standard"]', 'Prose Standard', '🔍 List of Countries', NULL, '[]', 'Starting a new career in solar  Transitioning from another field to solar  Career advancement in solar  Maintaining professional certifications  Developing curriculum or training programs  Other/not a', 28, 'high', 'web_o8u7CYfuMtZ5', 'eda77359056dbb6d6c6eb827d7d035d28146800a8e18fa4b948419baef56f99a', 'text-embedding-3-small', 'ai', 'small', 'e8915993-0b28-4e8d-812c-3995eb090804_M_25', 'web');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('b4cc76d21ec0fcfe3f94351997d2e47e0ec9ae1dcdd572f75a8cb09014ee08db', 'admin', 'By clicking submit, you are agreeing to communication with SEI in accordance with our  Privacy Policy .

-  Email     This field is for validation purposes and should be left unchanged.

##  PATHWAYS TO SUCCESS

##  PATHWAYS TO SUCCESS

Certificate programs tailored to help you achieve your professional goals.

Certificate programs tailored to help you achieve your professional goals.

## Residential & Commercial PV Systems Certificate

Learn grid-direct and battery-based photovoltaic design for residential and commercial applications.   Learn more▸

## Residential & Commercial PV Systems Online Certificate

Master residential and commercial grid-tied and battery-based solar design through online training.   Learn more▸

## Battery-Based PV Systems Certificate

Get trained on the technical application of solar photovoltaic battery-based systems to serve many different areas.   Learn more▸

## Solar Business & Technical Sales Certificate

Learn the technical, economic, and financial aspects of the solar industry to prepare yourself for the fast paced solar industry.   Learn more▸

## International & Developing World Applications Certificate

Learn common battery-based photovoltaic technologies to apply renewable energy in some of the remotest areas of of the world.   Learn more▸

## Solar Professionals Trainer Certificate

Experience SEI’s best curriculum and lab training experience for you and your instructional staff to put on a solar training program at your school or organization.   Learn more▸

##  The world  needs people to power the clean energy revolution&#8230;

##  THESE PEOPLE NEED  YOU

##  The world  needs people to power the clean energy revolution&#8230;

##  THESE PEOPLE NEED  YOU

DONATE TO SEI TODAY                     0   Solar Professionals Trained         0   Years of Training         0  %   Of the World&#8217;s Solar Involve SEI Students

##  WHAT OTHERS ARE SAYING

##  WHAT OTHERS ARE SAYING', 'v1', '2026-08-19 13:12:48', '["pathways-to-success","residential-commercial-pv-systems-certificate","residential-commercial-pv-systems-online-certifica","battery-based-pv-systems-certificate","solar-business-technical-sales-certificate","international-developing-world-applications-certif","solar-professionals-trainer-certificate","the-world-needs-people-to-power-the-clean-energy-r"]', 'Prose Standard', '📄 PATHWAYS TO SUCCESS', NULL, '[]', 'By clicking submit, you are agreeing to communication with SEI in accordance with our  Privacy Policy ', 29, 'high', 'web_o8u7CYfuMtZ5', '9b500ca123cafb322672a5a8e079f4aaf560cef93c088f57c6fa2dcd04966ab5', 'text-embedding-3-small', 'ai', 'large', NULL, 'web');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('e1983a2ecb9fc7a3c9c3da0286554414cf21a461f339a81ff22437579d59d36b', 'admin', 'By clicking submit, you are agreeing to communication with SEI in accordance with our  Privacy Policy .

-  Email     This field is for validation purposes and should be left unchanged.

##  PATHWAYS TO SUCCESS

##  PATHWAYS TO SUCCESS

Certificate programs tailored to help you achieve your professional goals.

Certificate programs tailored to help you achieve your professional goals.

## Residential & Commercial PV Systems Certificate

Learn grid-direct and battery-based photovoltaic design for residential and commercial applications.   Learn more▸

## Residential & Commercial PV Systems Online Certificate

Master residential and commercial grid-tied and battery-based solar design through online training.   Learn more▸

## Battery-Based PV Systems Certificate

Get trained on the technical application of solar photovoltaic battery-based systems to serve many different areas.   Learn more▸

## Solar Business & Technical Sales Certificate

Learn the technical, economic, and financial aspects of the solar industry to prepare yourself for the fast paced solar industry.   Learn more▸

## International & Developing World Applications Certificate

Learn common battery-based photovoltaic technologies to apply renewable energy in some of the remotest areas of of the world.   Learn more▸

## Solar Professionals Trainer Certificate', 'v1', '2026-08-19 13:12:48', '["pathways-to-success","residential-commercial-pv-systems-certificate","residential-commercial-pv-systems-online-certifica","battery-based-pv-systems-certificate","solar-business-technical-sales-certificate","international-developing-world-applications-certif","solar-professionals-trainer-certificate","SEI"]', 'Prose Standard', '📝 PATHWAYS TO SUCCESS', NULL, '[]', 'By clicking submit, you are agreeing to communication with SEI in accordance with our  Privacy Policy ', 30, 'high', 'web_o8u7CYfuMtZ5', '21e152d2f749d68663f001fed7cf6518fdc10886c0532ae69430d03ef62e031f', 'text-embedding-3-small', 'ai', 'medium', 'e8915993-0b28-4e8d-812c-3995eb090804_L_30', 'web');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('73da162e9955ca732d390f2aa6aa6d1a30dc767588f6a15129e72b961a00c8c9', 'admin', 'By clicking submit, you are agreeing to communication with SEI in accordance with our  Privacy Policy .

-  Email     This field is for validation purposes and should be left unchanged.

##  PATHWAYS TO SUCCESS

##  PATHWAYS TO SUCCESS

Certificate programs tailored to help you achieve your professional goals.

Certificate programs tailored to help you achieve your professional goals.

## Residential & Commercial PV Systems Certificate', 'v1', '2026-08-19 13:12:48', '["agreement-to-privacy-policy","pathways-to-success","residential-commercial-pv-systems-certificate","SEI","TO","PV","privacy-policy","email-this"]', 'Prose Standard', '🔍 Agreement to Privacy Policy', NULL, '[]', 'By clicking submit, you are agreeing to communication with SEI in accordance with our  Privacy Policy ', 31, 'high', 'web_o8u7CYfuMtZ5', 'e403cd89f143f971ffad2c1898fa1388ef0010775f7cf0d80e11009d97e9b07b', 'text-embedding-3-small', 'ai', 'small', 'e8915993-0b28-4e8d-812c-3995eb090804_M_31', 'web');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('af91665a448be2cf3824d3149a52dc7db082283bde1ac7fdef21aa3a86234577', 'admin', 'Learn grid-direct and battery-based photovoltaic design for residential and commercial applications.

Learn more▸

## Residential & Commercial PV Systems Online Certificate

Master residential and commercial grid-tied and battery-based solar design through online training.

Learn more▸

## Battery-Based PV Systems Certificate

Get trained on the technical application of solar photovoltaic battery-based systems to serve many different areas.', 'v1', '2026-08-19 13:12:48', '["agreement-to-privacy-policy","residential-commercial-pv-systems-online-certifica","battery-based-pv-systems-certificate","PV","privacy-policy","systems-online-certificate-master","systems-certificate-get","prose-standard"]', 'Prose Standard', '🔍 Agreement to Privacy Policy', NULL, '[]', 'Learn grid-direct and battery-based photovoltaic design for residential and commercial applications', 32, 'high', 'web_o8u7CYfuMtZ5', 'fb4d9dcae7ea8e2a8488d8ed6f2b4ff0f6383d6e127785b43e4a6179674cd89f', 'text-embedding-3-small', 'ai', 'small', 'e8915993-0b28-4e8d-812c-3995eb090804_M_31', 'web');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('070596eee860a2a0750fb1eadc87946aa5cbb764d4a377078e01ae99cd134172', 'admin', 'Learn more▸

## Solar Business & Technical Sales Certificate

Learn the technical, economic, and financial aspects of the solar industry to prepare yourself for the fast paced solar industry.

Learn more▸

## International & Developing World Applications Certificate

Learn common battery-based photovoltaic technologies to apply renewable energy in some of the remotest areas of of the world.

Learn more▸

## Solar Professionals Trainer Certificate', 'v1', '2026-08-19 13:12:48', '["agreement-to-privacy-policy","solar-business-technical-sales-certificate","international-developing-world-applications-certif","solar-professionals-trainer-certificate","privacy-policy","solar-business","technical-sales-certificate-learn","prose-standard"]', 'Prose Standard', '🔍 Agreement to Privacy Policy', NULL, '[]', 'Learn more▸

## Solar Business & Technical Sales Certificate

Learn the technical, economic, and financial aspects of the solar industry to prepare yourself for the fast paced solar industry', 33, 'high', 'web_o8u7CYfuMtZ5', 'aaf682e56cbc0917deea5d60d3c45b7c29729f31db56215b4bd1e06723a509df', 'text-embedding-3-small', 'ai', 'small', 'e8915993-0b28-4e8d-812c-3995eb090804_M_31', 'web');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('3a768d6cdd75b84d0461d20829d52d11967ac3a13aa0090799e7a53838b316b5', 'admin', 'Experience SEI’s best curriculum and lab training experience for you and your instructional staff to put on a solar training program at your school or organization.   Learn more▸

##  The world  needs people to power the clean energy revolution&#8230;

##  THESE PEOPLE NEED  YOU

##  The world  needs people to power the clean energy revolution&#8230;

##  THESE PEOPLE NEED  YOU

DONATE TO SEI TODAY                     0   Solar Professionals Trained         0   Years of Training         0  %   Of the World&#8217;s Solar Involve SEI Students

##  WHAT OTHERS ARE SAYING

##  WHAT OTHERS ARE SAYING', 'v1', '2026-08-19 13:12:48', '["the-world-needs-people-to-power-the-clean-energy-r","these-people-need-you","what-others-are-saying","SEI","THESE","PEOPLE","NEED","DONATE"]', 'Prose Standard', '📝 The world  needs people to power the clean energy revolution&8230;', NULL, '[]', 'Experience SEI’s best curriculum and lab training experience for you and your instructional staff to put on a solar training program at your school or organization', 34, 'high', 'web_o8u7CYfuMtZ5', 'c308f5ffa43085e9f62c244e038de4d84d2d5f3dcdac726d30be60db2dff20df', 'text-embedding-3-small', 'ai', 'medium', 'e8915993-0b28-4e8d-812c-3995eb090804_L_30', 'web');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('46fa6eee88ff36cbdf31806a07b85e03363147de217e79641c55c05363ccab0e', 'admin', 'Experience SEI’s best curriculum and lab training experience for you and your instructional staff to put on a solar training program at your school or organization.

Learn more▸

##  The world  needs people to power the clean energy revolution&#8230;

##  THESE PEOPLE NEED  YOU

##  The world  needs people to power the clean energy revolution&#8230;

##  THESE PEOPLE NEED  YOU', 'v1', '2026-08-19 13:12:48', '["certificate-programs-overview","the-world-needs-people-to-power-the-clean-energy-r","these-people-need-you","SEI","THESE","PEOPLE","NEED","prose-standard"]', 'Prose Standard', '🔍 Certificate Programs Overview', NULL, '[]', 'Experience SEI’s best curriculum and lab training experience for you and your instructional staff to put on a solar training program at your school or organization', 35, 'high', 'web_o8u7CYfuMtZ5', '319889dc5d54cb824b43123ede45cab834045591787181292e52625f2053b00d', 'text-embedding-3-small', 'ai', 'small', 'e8915993-0b28-4e8d-812c-3995eb090804_M_35', 'web');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('6a908a0d2a59e4348c103a0afde90168ebdec10c21e575091b29180f6b6a9933', 'admin', 'DONATE TO SEI TODAY                     0   Solar Professionals Trained         0   Years of Training         0  %   Of the World&#8217;s Solar Involve SEI Students

##  WHAT OTHERS ARE SAYING

##  WHAT OTHERS ARE SAYING', 'v1', '2026-08-19 13:12:48', '["certificate-programs-overview","what-others-are-saying","DONATE","TO","SEI","TODAY","WHAT","OTHERS"]', 'Prose Standard', '🔍 Certificate Programs Overview', NULL, '[]', 'DONATE TO SEI TODAY                     0   Solar Professionals Trained         0   Years of Training         0  %   Of the World&#8217;s Solar Involve SEI Students

##  WHAT OTHERS ARE SAYING

##  WH', 36, 'high', 'web_o8u7CYfuMtZ5', '2b4107f8283a6cb44359723f712830c347c1fa171832009c76a12dea28454aa9', 'text-embedding-3-small', 'ai', 'small', 'e8915993-0b28-4e8d-812c-3995eb090804_M_35', 'web');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('a0137027dc80522290571a4a33a003bb8bbd532049b7a8ff115e952fb44807da', 'admin', 'Luciano D                   The PV 101 online course offered by SEI was an invaluable resource for me as it both allowed me to learn at a comfortable pace, never feeling stressed out about the deadline, and also challenging me to stay focused and really let the lessons sink in. Navigating the website was a breeze, which was accessible 24/7. All the lessons were very clear and easy to follow in my opinion, sometimes requiring me to slow down and often replaying certain details, but still easy and clear to follow along. The presenters are great, the quizzes reasonable, and the instructors were accessible to answering any questions. I can honestly say that this course met my expectations and even exceeded them for being an entry level 101 course. For that I am quite content and I plan to continue taking more courses here at SEI online.              Maneesha Madhuhansi                   I would like to sincerely thank the SEI team for providing these valuable courses free of charge. I am genuinely grateful to have found this program, and it has greatly supported me in stepping forward on my career path.              Divine Ejike                   The course I took was really packed with knowledge and insights for anyone who is willing to learn about Solar and renewable energy. I would highly recommend SEI. I also loved the delivery from all the instructors. A big thank you to SEI for putting the Intro to RE100 together and making it accessible and free.              Miguel Benero                   I just want to express my deepest gratitude for the opportunity SEI provided me to participate in its solar installation training program.

This experience has been profoundly enriching, both professionally and personally. Thanks to the course, I was able to strengthen my knowledge as a licensed electrician and acquire new skills in the field of solar energy. This training has opened doors for me to work as a solar system installer, allowing me to help my family achieve greater energy self-sufficiency by installing battery-based systems. This has been especially valuable in our community, which has faced repeated tropical storms over the years.

Furthermore, the course has inspired me to support others in transitioning to cleaner energy sources, promoting independence from fossil fuels and fostering energy resilience in our region.

I would like to sincerely thank the instructors, who were always available to provide guidance and support throughout the entire process. The fact that the course was offered in Spanish was essential to my learning, as it allowed me to better understand the material and successfully pass the exams that assessed the knowledge I had acquired.

I encourage other professionals interested in the solar field to consider this opportunity, as it can represent a meaningful change in their lives and communities.

With gratitude and respect,', 'v1', '2026-08-19 13:12:48', '["PV","SEI","procedure","maneesha-madhuhansi","divine-ejike-the","miguel-benero","prose-standard"]', 'Prose Standard', '📄 Large Chunk', NULL, '[]', 'Luciano D                   The PV 101 online course offered by SEI was an invaluable resource for me as it both allowed me to learn at a comfortable pace, never feeling stressed out about the deadlin', 37, 'high', 'web_o8u7CYfuMtZ5', 'b5affd4945fbfa2fb06d498ded007f9f9e9648793eadc08fd5d7d823cd2cd50c', 'text-embedding-3-small', 'ai', 'large', NULL, 'web');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('3170a3266e669169a91a1333ba6371b08c615fc42d8e5bc87f94020f9dc544e6', 'admin', 'Luciano D                   The PV 101 online course offered by SEI was an invaluable resource for me as it both allowed me to learn at a comfortable pace, never feeling stressed out about the deadline, and also challenging me to stay focused and really let the lessons sink in. Navigating the website was a breeze, which was accessible 24/7. All the lessons were very clear and easy to follow in my opinion, sometimes requiring me to slow down and often replaying certain details, but still easy and clear to follow along. The presenters are great, the quizzes reasonable, and the instructors were accessible to answering any questions. I can honestly say that this course met my expectations and even exceeded them for being an entry level 101 course. For that I am quite content and I plan to continue taking more courses here at SEI online.              Maneesha Madhuhansi                   I would like to sincerely thank the SEI team for providing these valuable courses free of charge. I am genuinely grateful to have found this program, and it has greatly supported me in stepping forward on my career path.              Divine Ejike                   The course I took was really packed with knowledge and insights for anyone who is willing to learn about Solar and renewable energy. I would highly recommend SEI. I also loved the delivery from all the instructors. A big thank you to SEI for putting the Intro to RE100 together and making it accessible and free.              Miguel Benero                   I just want to express my deepest gratitude for the opportunity SEI provided me to participate in its solar installation training program.', 'v1', '2026-08-19 13:12:48', '["PV","SEI","maneesha-madhuhansi","divine-ejike-the","miguel-benero","prose-standard"]', 'Prose Standard', '📝 Medium Chunk', NULL, '[]', 'Luciano D                   The PV 101 online course offered by SEI was an invaluable resource for me as it both allowed me to learn at a comfortable pace, never feeling stressed out about the deadlin', 38, 'high', 'web_o8u7CYfuMtZ5', '047c21eae5ac1660ad085237594e18d2914dba30e1281f7ffaf12d9796d29bfa', 'text-embedding-3-small', 'ai', 'medium', 'e8915993-0b28-4e8d-812c-3995eb090804_L_38', 'web');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('3e680200b4c944e9b567c458968ba4765f32ba682435a811c5ca09bae41c45ac', 'admin', 'Luciano D                   The PV 101 online course offered by SEI was an invaluable resource for me as it both allowed me to learn at a comfortable pace, never feeling stressed out about the deadline, and also challenging me to stay focused and really let the lessons sink in.

Navigating the website was a breeze, which was accessible 24/7.', 'v1', '2026-08-19 13:12:48', '["course-experience-and-accessibility","PV","SEI","prose-standard"]', 'Prose Standard', '🔍 Course Experience and Accessibility', NULL, '[]', 'Luciano D                   The PV 101 online course offered by SEI was an invaluable resource for me as it both allowed me to learn at a comfortable pace, never feeling stressed out about the deadlin', 39, 'high', 'web_o8u7CYfuMtZ5', 'bea045c6004ad1b2856ee263e085d7db62bc95ba8600fe795d7425cc324950a1', 'text-embedding-3-small', 'ai', 'small', 'e8915993-0b28-4e8d-812c-3995eb090804_M_39', 'web');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('de05916c805b558db6809c70c63ae5ff89992350995968b856ab3f058ba93916', 'admin', 'All the lessons were very clear and easy to follow in my opinion, sometimes requiring me to slow down and often replaying certain details, but still easy and clear to follow along.

The presenters are great, the quizzes reasonable, and the instructors were accessible to answering any questions.

I can honestly say that this course met my expectations and even exceeded them for being an entry level 101 course.', 'v1', '2026-08-19 13:12:48', '["course-experience-and-accessibility","prose-standard"]', 'Prose Standard', '🔍 Course Experience and Accessibility', NULL, '[]', 'All the lessons were very clear and easy to follow in my opinion, sometimes requiring me to slow down and often replaying certain details, but still easy and clear to follow along', 40, 'high', 'web_o8u7CYfuMtZ5', '23a9ca44d8ad8ab9858df9247d4799262ffd1429200a488e79e3e21cd1dcbce1', 'text-embedding-3-small', 'ai', 'small', 'e8915993-0b28-4e8d-812c-3995eb090804_M_39', 'web');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('088bdb5b8b55decff373f9bf124656778e849cab734f28489e1f7f40728b5322', 'admin', 'For that I am quite content and I plan to continue taking more courses here at SEI online.

Maneesha Madhuhansi                   I would like to sincerely thank the SEI team for providing these valuable courses free of charge.

I am genuinely grateful to have found this program, and it has greatly supported me in stepping forward on my career path.', 'v1', '2026-08-19 13:12:48', '["course-experience-and-accessibility","SEI","maneesha-madhuhansi","prose-standard"]', 'Prose Standard', '🔍 Course Experience and Accessibility', NULL, '[]', 'For that I am quite content and I plan to continue taking more courses here at SEI online', 41, 'high', 'web_o8u7CYfuMtZ5', '09894399f253c8ca28794f3cae40ad879a09385d00f57b099b3795350bcd969f', 'text-embedding-3-small', 'ai', 'small', 'e8915993-0b28-4e8d-812c-3995eb090804_M_39', 'web');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('877f05c6077ca3f104620a975cb94c92b87638504bf5aa34001d35f452e89a48', 'admin', 'Divine Ejike                   The course I took was really packed with knowledge and insights for anyone who is willing to learn about Solar and renewable energy.

I would highly recommend SEI.

I also loved the delivery from all the instructors.

A big thank you to SEI for putting the Intro to RE100 together and making it accessible and free.', 'v1', '2026-08-19 13:12:48', '["course-experience-and-accessibility","SEI","divine-ejike-the","prose-standard"]', 'Prose Standard', '🔍 Course Experience and Accessibility', NULL, '[]', 'Divine Ejike                   The course I took was really packed with knowledge and insights for anyone who is willing to learn about Solar and renewable energy', 42, 'high', 'web_o8u7CYfuMtZ5', '596f9ab41739eda85589fef894c0c4f6a5abc5a1ad7cfc0f89ac019e98bd29af', 'text-embedding-3-small', 'ai', 'small', 'e8915993-0b28-4e8d-812c-3995eb090804_M_39', 'web');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('0e291eec0401278d2165b6291c7d9ea6d3227ee79f7223b76643af52118c080c', 'admin', 'Miguel Benero                   I just want to express my deepest gratitude for the opportunity SEI provided me to participate in its solar installation training program.', 'v1', '2026-08-19 13:12:48', '["course-experience-and-accessibility","SEI","miguel-benero","prose-standard"]', 'Prose Standard', '🔍 Course Experience and Accessibility', NULL, '[]', 'Miguel Benero                   I just want to express my deepest gratitude for the opportunity SEI provided me to participate in its solar installation training program', 43, 'high', 'web_o8u7CYfuMtZ5', 'af9b5ad3adec5782d064e88c74ce5671a51ba1e84750c3975bc8189e4f165113', 'text-embedding-3-small', 'ai', 'small', 'e8915993-0b28-4e8d-812c-3995eb090804_M_39', 'web');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('9409f824e1389f550a34365548761be976c2b8987a12fb4f5d80a963dcf029c0', 'admin', 'This experience has been profoundly enriching, both professionally and personally. Thanks to the course, I was able to strengthen my knowledge as a licensed electrician and acquire new skills in the field of solar energy. This training has opened doors for me to work as a solar system installer, allowing me to help my family achieve greater energy self-sufficiency by installing battery-based systems. This has been especially valuable in our community, which has faced repeated tropical storms over the years.

Furthermore, the course has inspired me to support others in transitioning to cleaner energy sources, promoting independence from fossil fuels and fostering energy resilience in our region.

I would like to sincerely thank the instructors, who were always available to provide guidance and support throughout the entire process. The fact that the course was offered in Spanish was essential to my learning, as it allowed me to better understand the material and successfully pass the exams that assessed the knowledge I had acquired.

I encourage other professionals interested in the solar field to consider this opportunity, as it can represent a meaningful change in their lives and communities.

With gratitude and respect,', 'v1', '2026-08-19 13:12:48', '["procedure","prose-standard"]', 'Prose Standard', '📝 Medium Chunk', NULL, '[]', 'This experience has been profoundly enriching, both professionally and personally', 44, 'high', 'web_o8u7CYfuMtZ5', 'a660a66505fa3ee0fee1b71b2653a566faf26bdecf750a2604abe6be20508873', 'text-embedding-3-small', 'ai', 'medium', 'e8915993-0b28-4e8d-812c-3995eb090804_L_38', 'web');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('fcc6a47744e02c8db3f8df84d7c6a202f147a157956626b55b2dc792b9fcd6ce', 'admin', 'This experience has been profoundly enriching, both professionally and personally.

Thanks to the course, I was able to strengthen my knowledge as a licensed electrician and acquire new skills in the field of solar energy.

This training has opened doors for me to work as a solar system installer, allowing me to help my family achieve greater energy self-sufficiency by installing battery-based systems.', 'v1', '2026-08-19 13:12:48', '["gratitude-for-free-education","free-education","prose-standard"]', 'Prose Standard', '🔍 Gratitude for Free Education', NULL, '[]', 'This experience has been profoundly enriching, both professionally and personally', 45, 'high', 'web_o8u7CYfuMtZ5', '808382c0975b521dadff156f6a2f874e58455510c724a684b2282780217752e3', 'text-embedding-3-small', 'ai', 'small', 'e8915993-0b28-4e8d-812c-3995eb090804_M_45', 'web');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('4e078128aded4becb0aabd89dc0db87e9699dfe227ad5e962b8e3e789825fd20', 'admin', 'This has been especially valuable in our community, which has faced repeated tropical storms over the years.

Furthermore, the course has inspired me to support others in transitioning to cleaner energy sources, promoting independence from fossil fuels and fostering energy resilience in our region.

I would like to sincerely thank the instructors, who were always available to provide guidance and support throughout the entire process.', 'v1', '2026-08-19 13:12:48', '["gratitude-for-free-education","procedure","free-education","prose-standard"]', 'Prose Standard', '🔍 Gratitude for Free Education', NULL, '[]', 'This has been especially valuable in our community, which has faced repeated tropical storms over the years', 46, 'high', 'web_o8u7CYfuMtZ5', '73378af6f43c870ea529e89699d8f8117a1a03aeb7f08b7dc55a7aa8a53b717b', 'text-embedding-3-small', 'ai', 'small', 'e8915993-0b28-4e8d-812c-3995eb090804_M_45', 'web');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('ed506642b4780066a320ad4f90c5b99adbaba14bdc155e57443585ba53efd752', 'admin', 'The fact that the course was offered in Spanish was essential to my learning, as it allowed me to better understand the material and successfully pass the exams that assessed the knowledge I had acquired.

I encourage other professionals interested in the solar field to consider this opportunity, as it can represent a meaningful change in their lives and communities.

With gratitude and respect,', 'v1', '2026-08-19 13:12:48', '["gratitude-for-free-education","free-education","prose-standard"]', 'Prose Standard', '🔍 Gratitude for Free Education', NULL, '[]', 'The fact that the course was offered in Spanish was essential to my learning, as it allowed me to better understand the material and successfully pass the exams that assessed the knowledge I had acqui', 47, 'high', 'web_o8u7CYfuMtZ5', 'd273c4c2c109d88eca1b6d19a5dde615c8158caee92a82a1f34f80e9e4a2c693', 'text-embedding-3-small', 'ai', 'small', 'e8915993-0b28-4e8d-812c-3995eb090804_M_45', 'web');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('806564454afbe54b50e2d6c1e539cd33cda056cac85bef680c2805db04560b3e', 'admin', 'Miguel Benero              Cristian Laverde Koenig                   Solar Energy International does what many in the industry fail to do, by making available free introductory courses that can clarify what the renewable energy industry is all about for those interested to learn what an inevitable future will look like, and for those that want to be part of it.              Twyla Hermann                   Such an interesting solar energy school. I found it while visiting Paonia and declared if I could ever put the time and money together at the same time I&#039;d be back to take classes. That time happened for me this year. OMG! I&#039;m enthralled. I highly recommend.              Ella K                   This course was a very good experience for me. I enjoyed the lessons and the way the instructors explained everything. The atmosphere of the course was wonderful, very supportive, and it motivated me to continue. I am very thankful to SEI and to our instructors.              Muna A. Adem                   I recently took my first solar energy course with SEI, and it was an excellent introduction for beginners. The course was informative, well-structured, and covered the key areas needed to build a solid foundation. It even inspired me to believe that the sunlight I see every morning could power a village—or even a house—helping students learn elsewhere! I especially appreciated the materials, though adding more examples from international solar projects could make it even stronger. Highly recommend SEI for anyone interested in renewable energy!              Agobeazim Ugbode                   The online SEI free course is excellent. The tutors make the course easy to understand and enjoyable. This is a very fascinating field and very useful for development in the developing world. I am fascinated by the preparatory free course and would like to study the recommended courses. The deal is that I would need to practice the theory. I live in England where access to practice is a little bit difficult.

##  ALUMNI STORIES

##  ALUMNI STORIES

-          Chris    2026-06-30T10:29:38-06:00

####  From Journeyman Installer to Project Leader: How Jeremiah Ogbondeminu Is Bridging Nigeria&#8217;s Energy Gap

-          Chris    2026-06-11T07:51:15-06:00

####  Alumni Highlight: Madeline Fernandini-Morales is Building Solar Resilience in Puerto Rico

-          Chris    2026-04-07T15:30:44-06:00

####  From SEI Student to Tribal Solar Trainer: The Story of Marie Kills Warrior

-          Chris    2024-05-08T12:18:08-06:00

####  Alumni Highlight: Upskilling Can Turn Dreams Into Reality

Close product quick view &times;

##

NEED HELP?    TALK TO A STUDENT COUNSELOR

### Student Counselor Contact Form

Please send us your contact information and questions, and one of our student counselors will be in touch to answer your questions via your preferred contact method. To speak with someone immediately over the phone, please call 1-970-527-7657 option 1.  Required fields are denoted with *

Name  *

First

Last

Email*  *', 'v1', '2026-08-19 13:12:48', '["alumni-stories","alumni-highlight-madeline-fernandini-morales-is-bu","from-sei-student-to-tribal-solar-trainer-the-story","alumni-highlight-upskilling-can-turn-dreams-into-r","need-help-talk-to-a-student-counselor","student-counselor-contact-form","OMG","SEI"]', 'Prose Standard', '📄 ALUMNI STORIES', NULL, '[]', 'Miguel Benero              Cristian Laverde Koenig                   Solar Energy International does what many in the industry fail to do, by making available free introductory courses that can clarif', 48, 'high', 'web_o8u7CYfuMtZ5', 'e2c543488cd2f8447837e978d891ee7841aefef3ad602b622175bf1cd6c28d2b', 'text-embedding-3-small', 'ai', 'large', NULL, 'web');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('0583e50e3975c18c6250cc5fa8d27b0e20b2927240d5d98a18d68fefbd37bd98', 'admin', 'Miguel Benero              Cristian Laverde Koenig                   Solar Energy International does what many in the industry fail to do, by making available free introductory courses that can clarify what the renewable energy industry is all about for those interested to learn what an inevitable future will look like, and for those that want to be part of it.              Twyla Hermann                   Such an interesting solar energy school. I found it while visiting Paonia and declared if I could ever put the time and money together at the same time I&#039;d be back to take classes. That time happened for me this year. OMG! I&#039;m enthralled. I highly recommend.              Ella K                   This course was a very good experience for me. I enjoyed the lessons and the way the instructors explained everything. The atmosphere of the course was wonderful, very supportive, and it motivated me to continue. I am very thankful to SEI and to our instructors.              Muna A. Adem                   I recently took my first solar energy course with SEI, and it was an excellent introduction for beginners. The course was informative, well-structured, and covered the key areas needed to build a solid foundation. It even inspired me to believe that the sunlight I see every morning could power a village—or even a house—helping students learn elsewhere! I especially appreciated the materials, though adding more examples from international solar projects could make it even stronger. Highly recommend SEI for anyone interested in renewable energy!              Agobeazim Ugbode                   The online SEI free course is excellent. The tutors make the course easy to understand and enjoyable. This is a very fascinating field and very useful for development in the developing world. I am fascinated by the preparatory free course and would like to study the recommended courses. The deal is that I would need to practice the theory. I live in England where access to practice is a little bit difficult.', 'v1', '2026-08-19 13:12:48', '["OMG","SEI","solar-energy-international","twyla-hermann-such","agobeazim-ugbode-the","prose-standard"]', 'Prose Standard', '📝 Medium Chunk', NULL, '[]', 'Miguel Benero              Cristian Laverde Koenig                   Solar Energy International does what many in the industry fail to do, by making available free introductory courses that can clarif', 49, 'high', 'web_o8u7CYfuMtZ5', '3860c1a9b9a4190b9e4ef9d1fd6783943fc4557ceda594cd1df5510cc7014eb3', 'text-embedding-3-small', 'ai', 'medium', 'e8915993-0b28-4e8d-812c-3995eb090804_L_49', 'web');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('0c6ea9460773ead273a545373e76aa15484a2fa9aea6ae69c7a52f1f7a86fa0c', 'admin', 'Miguel Benero              Cristian Laverde Koenig                   Solar Energy International does what many in the industry fail to do, by making available free introductory courses that can clarify what the renewable energy industry is all about for those interested to learn what an inevitable future will look like, and for those that want to be part of it.

Twyla Hermann                   Such an interesting solar energy school.', 'v1', '2026-08-19 13:12:48', '["introduction-to-solar-energy-courses","solar-energy-courses","solar-energy-international","twyla-hermann-such","prose-standard"]', 'Prose Standard', '🔍 Introduction to Solar Energy Courses', NULL, '[]', 'Miguel Benero              Cristian Laverde Koenig                   Solar Energy International does what many in the industry fail to do, by making available free introductory courses that can clarif', 50, 'high', 'web_o8u7CYfuMtZ5', '504aa9fd4308e88c70603b4f64c2c3915d4c9496deeb9be209c159117a481842', 'text-embedding-3-small', 'ai', 'small', 'e8915993-0b28-4e8d-812c-3995eb090804_M_50', 'web');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('20fa98b9d8bb614d520bb9e7947fce7aa2aa7f864b89f79cf1c49fc91813404e', 'admin', 'I found it while visiting Paonia and declared if I could ever put the time and money together at the same time I&#039;d be back to take classes.

That time happened for me this year.

OMG!

I&#039;m enthralled.

I highly recommend.

Ella K                   This course was a very good experience for me.

I enjoyed the lessons and the way the instructors explained everything.', 'v1', '2026-08-19 13:12:48', '["introduction-to-solar-energy-courses","OMG","solar-energy-courses","prose-standard"]', 'Prose Standard', '🔍 Introduction to Solar Energy Courses', NULL, '[]', 'I found it while visiting Paonia and declared if I could ever put the time and money together at the same time I&#039;d be back to take classes', 51, 'high', 'web_o8u7CYfuMtZ5', '7f9b8b638356a495ae548f1311550df17a26788efc159d31c1a6242c7bdbeb9d', 'text-embedding-3-small', 'ai', 'small', 'e8915993-0b28-4e8d-812c-3995eb090804_M_50', 'web');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('e1400a69b35309162b654ede81d62438ae25f434be95e951d82c03d420c00a9c', 'admin', 'The atmosphere of the course was wonderful, very supportive, and it motivated me to continue.

I am very thankful to SEI and to our instructors.

Muna A.

Adem                   I recently took my first solar energy course with SEI, and it was an excellent introduction for beginners.

The course was informative, well-structured, and covered the key areas needed to build a solid foundation.', 'v1', '2026-08-19 13:12:48', '["introduction-to-solar-energy-courses","SEI","solar-energy-courses","prose-standard"]', 'Prose Standard', '🔍 Introduction to Solar Energy Courses', NULL, '[]', 'The atmosphere of the course was wonderful, very supportive, and it motivated me to continue', 52, 'high', 'web_o8u7CYfuMtZ5', '242d5c81703ffc6c25ea497152b05aa32886b5b7834f7e886d6677a58668f4a2', 'text-embedding-3-small', 'ai', 'small', 'e8915993-0b28-4e8d-812c-3995eb090804_M_50', 'web');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('6fd0d66690fcdaccba7040535724a12f6ea118ce09945117db5e0351cf1c6efa', 'admin', 'It even inspired me to believe that the sunlight I see every morning could power a village—or even a house—helping students learn elsewhere!

I especially appreciated the materials, though adding more examples from international solar projects could make it even stronger.

Highly recommend SEI for anyone interested in renewable energy!

Agobeazim Ugbode                   The online SEI free course is excellent.', 'v1', '2026-08-19 13:12:48', '["introduction-to-solar-energy-courses","SEI","solar-energy-courses","agobeazim-ugbode-the","prose-standard"]', 'Prose Standard', '🔍 Introduction to Solar Energy Courses', NULL, '[]', 'It even inspired me to believe that the sunlight I see every morning could power a village—or even a house—helping students learn elsewhere', 53, 'high', 'web_o8u7CYfuMtZ5', '8607369864d3abe8853b1b59714b6848d6096adf640a63fe0829a392a845747a', 'text-embedding-3-small', 'ai', 'small', 'e8915993-0b28-4e8d-812c-3995eb090804_M_50', 'web');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('b30257a2feb10d196e75b71d4b1e597daa8c5634c943dce09e09609d55034a14', 'admin', 'The tutors make the course easy to understand and enjoyable.

This is a very fascinating field and very useful for development in the developing world.

I am fascinated by the preparatory free course and would like to study the recommended courses.

The deal is that I would need to practice the theory.

I live in England where access to practice is a little bit difficult.', 'v1', '2026-08-19 13:12:48', '["introduction-to-solar-energy-courses","solar-energy-courses","prose-standard"]', 'Prose Standard', '🔍 Introduction to Solar Energy Courses', NULL, '[]', 'The tutors make the course easy to understand and enjoyable', 54, 'high', 'web_o8u7CYfuMtZ5', 'f2190d8230e0b2f5cefa4363de94bac81ce3ab50ff9fc416de2c444fc18be1c4', 'text-embedding-3-small', 'ai', 'small', 'e8915993-0b28-4e8d-812c-3995eb090804_M_50', 'web');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('dab460c68722734786ae150ba00da365cd172dd3cc0f71ecb7b96bd90e90831c', 'admin', '##  ALUMNI STORIES

##  ALUMNI STORIES

-          Chris    2026-06-30T10:29:38-06:00

####  From Journeyman Installer to Project Leader: How Jeremiah Ogbondeminu Is Bridging Nigeria&#8217;s Energy Gap

-          Chris    2026-06-11T07:51:15-06:00

####  Alumni Highlight: Madeline Fernandini-Morales is Building Solar Resilience in Puerto Rico

-          Chris    2026-04-07T15:30:44-06:00

####  From SEI Student to Tribal Solar Trainer: The Story of Marie Kills Warrior

-          Chris    2024-05-08T12:18:08-06:00

####  Alumni Highlight: Upskilling Can Turn Dreams Into Reality

Close product quick view &times;

##

NEED HELP?    TALK TO A STUDENT COUNSELOR

### Student Counselor Contact Form

Please send us your contact information and questions, and one of our student counselors will be in touch to answer your questions via your preferred contact method. To speak with someone immediately over the phone, please call 1-970-527-7657 option 1.  Required fields are denoted with *

Name  *

First

Last

Email*  *', 'v1', '2026-08-19 13:12:48', '["alumni-stories","alumni-highlight-madeline-fernandini-morales-is-bu","from-sei-student-to-tribal-solar-trainer-the-story","alumni-highlight-upskilling-can-turn-dreams-into-r","need-help-talk-to-a-student-counselor","student-counselor-contact-form","ALUMNI","SEI"]', 'Prose Standard', '📝 ALUMNI STORIES', NULL, '[]', '##  ALUMNI STORIES

##  ALUMNI STORIES

-          Chris    2026-06-30T10:29:38-06:00

####  From Journeyman Installer to Project Leader: How Jeremiah Ogbondeminu Is Bridging Nigeria&#8217;s Energy Ga', 55, 'high', 'web_o8u7CYfuMtZ5', '43479f6001b4a90a81766e987039e77c93834b71e775353b4dfd4dcbe66ae8e4', 'text-embedding-3-small', 'ai', 'medium', 'e8915993-0b28-4e8d-812c-3995eb090804_L_49', 'web');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('10496fb5857a029d125325d2def27ab843990eb946ed6f0be6211fea14c9aae0', 'admin', '##  ALUMNI STORIES

##  ALUMNI STORIES

-          Chris    2026-06-30T10:29:38-06:00

####  From Journeyman Installer to Project Leader: How Jeremiah Ogbondeminu Is Bridging Nigeria&#8217;s Energy Gap

-          Chris    2026-06-11T07:51:15-06:00

####  Alumni Highlight: Madeline Fernandini-Morales is Building Solar Resilience in Puerto Rico

-          Chris    2026-04-07T15:30:44-06:00', 'v1', '2026-08-19 13:12:48', '["student-experiences-and-testimonials","alumni-stories","alumni-highlight-madeline-fernandini-morales-is-bu","ALUMNI","from-journeyman-installer","project-leader","prose-standard"]', 'Prose Standard', '🔍 Student Experiences and Testimonials', NULL, '[]', '##  ALUMNI STORIES

##  ALUMNI STORIES

-          Chris    2026-06-30T10:29:38-06:00

####  From Journeyman Installer to Project Leader: How Jeremiah Ogbondeminu Is Bridging Nigeria&#8217;s Energy Ga', 56, 'high', 'web_o8u7CYfuMtZ5', '57d5283da49d475b76a78794957c34ab99f0fd9f8bc57c59a7303cbb47432d35', 'text-embedding-3-small', 'ai', 'small', 'e8915993-0b28-4e8d-812c-3995eb090804_M_56', 'web');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('4ca7300fe3069a9031fcf793e9c7303fa407fa2b367fffbf18925e89275968c6', 'admin', '####  From SEI Student to Tribal Solar Trainer: The Story of Marie Kills Warrior

-          Chris    2024-05-08T12:18:08-06:00

####  Alumni Highlight: Upskilling Can Turn Dreams Into Reality

Close product quick view &times;

##

NEED HELP?

TALK TO A STUDENT COUNSELOR

### Student Counselor Contact Form', 'v1', '2026-08-19 13:12:48', '["student-experiences-and-testimonials","alumni-highlight-upskilling-can-turn-dreams-into-r","need-help","student-counselor-contact-form","SEI","NEED","HELP","TALK"]', 'Prose Standard', '🔍 Student Experiences and Testimonials', NULL, '[]', '####  From SEI Student to Tribal Solar Trainer: The Story of Marie Kills Warrior

-          Chris    2024-05-08T12:18:08-06:00

####  Alumni Highlight: Upskilling Can Turn Dreams Into Reality

Close ', 57, 'high', 'web_o8u7CYfuMtZ5', 'fe7274e80f7ba4bd12a9ee315a401fb85b0ab1e2ccdd3df297dd24ea62390929', 'text-embedding-3-small', 'ai', 'small', 'e8915993-0b28-4e8d-812c-3995eb090804_M_56', 'web');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('78983ebb8bed9d2b876e9b049bb7896cddc251e8969db92fd0da53fcc90e86e3', 'admin', 'Please send us your contact information and questions, and one of our student counselors will be in touch to answer your questions via your preferred contact method.

To speak with someone immediately over the phone, please call 1-970-527-7657 option 1.

Required fields are denoted with *

Name  *

First

Last

Email*  *', 'v1', '2026-08-19 13:12:48', '["student-experiences-and-testimonials","contact-info","phone:19705277657","first-last-email","prose-standard"]', 'Prose Standard', '🔍 Student Experiences and Testimonials', NULL, '[]', 'Please send us your contact information and questions, and one of our student counselors will be in touch to answer your questions via your preferred contact method', 58, 'high', 'web_o8u7CYfuMtZ5', 'b59f865bc6713982b2bdb910ba7156ebe291cc3efd64b91dd030dcb29b075b3a', 'text-embedding-3-small', 'ai', 'small', 'e8915993-0b28-4e8d-812c-3995eb090804_M_56', 'web');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('35feec9ccdbc61077e2ce596626e8b3dc4090d8d766aa7aff738f6c8beb4b2b0', 'admin', '-  Phone
-  Country  *      Country*  Afghanistan  Albania  Algeria  American Samoa  Andorra  Angola  Anguilla  Antarctica  Antigua and Barbuda  Argentina  Armenia  Aruba  Australia  Austria  Azerbaijan  Bahamas  Bahrain  Bangladesh  Barbados  Belarus  Belgium  Belize  Benin  Bermuda  Bhutan  Bolivia  Bonaire, Sint Eustatius and Saba  Bosnia and Herzegovina  Botswana  Bouvet Island  Brazil  British Indian Ocean Territory  Brunei Darussalam  Bulgaria  Burkina Faso  Burundi  Cambodia  Cameroon  Canada  Cape Verde  Cayman Islands  Central African Republic  Chad  Chile  China  Christmas Island  Cocos Islands  Colombia  Comoros  Congo, Democratic Republic of the  Congo, Republic of the  Cook Islands  Costa Rica  Croatia  Cuba  Curaçao  Cyprus  Czech Republic  Côte d&#039;Ivoire  Denmark  Djibouti  Dominica  Dominican Republic  Ecuador  Egypt  El Salvador  Equatorial Guinea  Eritrea  Estonia  Eswatini (Swaziland)  Ethiopia  Falkland Islands  Faroe Islands  Fiji  Finland  France  French Guiana  French Polynesia  French Southern Territories  Gabon  Gambia  Georgia  Germany  Ghana  Gibraltar  Greece  Greenland  Grenada  Guadeloupe  Guam  Guatemala  Guernsey  Guinea  Guinea-Bissau  Guyana  Haiti  Heard and McDonald Islands  Holy See  Honduras  Hong Kong  Hungary  Iceland  India  Indonesia  Iran  Iraq  Ireland  Isle of Man  Israel  Italy  Jamaica  Japan  Jersey  Jordan  Kazakhstan  Kenya  Kiribati  Kuwait  Kyrgyzstan  Lao People&#039;s Democratic Republic  Latvia  Lebanon  Lesotho  Liberia  Libya  Liechtenstein  Lithuania  Luxembourg  Macau  Macedonia  Madagascar  Malawi  Malaysia  Maldives  Mali  Malta  Marshall Islands  Martinique  Mauritania  Mauritius  Mayotte  Mexico  Micronesia  Moldova  Monaco  Mongolia  Montenegro  Montserrat  Morocco  Mozambique  Myanmar  Namibia  Nauru  Nepal  Netherlands  New Caledonia  New Zealand  Nicaragua  Niger  Nigeria  Niue  Norfolk Island  North Korea  Northern Mariana Islands  Norway  Oman  Pakistan  Palau  Palestine, State of  Panama  Papua New Guinea  Paraguay  Peru  Philippines  Pitcairn  Poland  Portugal  Puerto Rico  Qatar  Romania  Russia  Rwanda  Réunion  Saint Barthélemy  Saint Helena  Saint Kitts and Nevis  Saint Lucia  Saint Martin  Saint Pierre and Miquelon  Saint Vincent and the Grenadines  Samoa  San Marino  Sao Tome and Principe  Saudi Arabia  Senegal  Serbia  Seychelles  Sierra Leone  Singapore  Sint Maarten  Slovakia  Slovenia  Solomon Islands  Somalia  South Africa  South Georgia  South Korea  South Sudan  Spain  Sri Lanka  Sudan  Suriname  Svalbard and Jan Mayen Islands  Sweden  Switzerland  Syria  Taiwan  Tajikistan  Tanzania  Thailand  Timor-Leste  Togo  Tokelau  Tonga  Trinidad and Tobago  Tunisia  Turkey  Turkmenistan  Turks and Caicos Islands  Tuvalu  US Minor Outlying Islands  Uganda  Ukraine  United Arab Emirates  United Kingdom  United States  Uruguay  Uzbekistan  Vanuatu  Venezuela  Vietnam  Virgin Islands, British  Virgin Islands, U.S.  Wallis and Futuna  Western Sahara  Yemen  Zambia  Zimbabwe  Åland Islands
-  Questions / Comments*  *
-  CAPTCHA

By clicking submit, you are agreeing to communication with SEI in accordance with our  Privacy Policy .

-  Comments     This field is for validation purposes and should be left unchanged.', 'v1', '2026-08-19 13:12:48', '["US","SEI","afghanistan-albania-algeria-american-samoa","andorra-angola-anguilla-antarctica-antigua","barbuda-argentina-armenia-aruba-australia","prose-standard"]', 'Prose Standard', '📄 Large Chunk', NULL, '[]', '-  Phone
-  Country  *      Country*  Afghanistan  Albania  Algeria  American Samoa  Andorra  Angola  Anguilla  Antarctica  Antigua and Barbuda  Argentina  Armenia  Aruba  Australia  Austria  Azerbaij', 59, 'high', 'web_o8u7CYfuMtZ5', 'fc55737e2bbc966e1adfcbe71b360fd141359f3d9da1c1605ed5aa7a47217e1d', 'text-embedding-3-small', 'ai', 'large', NULL, 'web');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('ed3b467b90c1367e3a50778a0b6f90bbf46ab56813e038164c871a925a594eaa', 'admin', '-  Phone
-  Country  *      Country*  Afghanistan  Albania  Algeria  American Samoa  Andorra  Angola  Anguilla  Antarctica  Antigua and Barbuda  Argentina  Armenia  Aruba  Australia  Austria  Azerbaijan  Bahamas  Bahrain  Bangladesh  Barbados  Belarus  Belgium  Belize  Benin  Bermuda  Bhutan  Bolivia  Bonaire, Sint Eustatius and Saba  Bosnia and Herzegovina  Botswana  Bouvet Island  Brazil  British Indian Ocean Territory  Brunei Darussalam  Bulgaria  Burkina Faso  Burundi  Cambodia  Cameroon  Canada  Cape Verde  Cayman Islands  Central African Republic  Chad  Chile  China  Christmas Island  Cocos Islands  Colombia  Comoros  Congo, Democratic Republic of the  Congo, Republic of the  Cook Islands  Costa Rica  Croatia  Cuba  Curaçao  Cyprus  Czech Republic  Côte d&#039;Ivoire  Denmark  Djibouti  Dominica  Dominican Republic  Ecuador  Egypt  El Salvador  Equatorial Guinea  Eritrea  Estonia  Eswatini (Swaziland)  Ethiopia  Falkland Islands  Faroe Islands  Fiji  Finland  France  French Guiana  French Polynesia  French Southern Territories  Gabon  Gambia  Georgia  Germany  Ghana  Gibraltar  Greece  Greenland  Grenada  Guadeloupe  Guam  Guatemala  Guernsey  Guinea  Guinea-Bissau  Guyana  Haiti  Heard and McDonald Islands  Holy See  Honduras  Hong Kong  Hungary  Iceland  India  Indonesia  Iran  Iraq  Ireland  Isle of Man  Israel  Italy  Jamaica  Japan  Jersey  Jordan  Kazakhstan  Kenya  Kiribati  Kuwait  Kyrgyzstan  Lao People&#039;s Democratic Republic  Latvia  Lebanon  Lesotho  Liberia  Libya  Liechtenstein  Lithuania  Luxembourg  Macau  Macedonia  Madagascar  Malawi  Malaysia  Maldives  Mali  Malta  Marshall Islands  Martinique  Mauritania  Mauritius  Mayotte  Mexico  Micronesia  Moldova  Monaco  Mongolia  Montenegro  Montserrat  Morocco  Mozambique  Myanmar  Namibia  Nauru  Nepal  Netherlands  New Caledonia  New Zealand  Nicaragua  Niger  Nigeria  Niue  Norfolk Island  North Korea  Northern Mariana Islands  Norway  Oman  Pakistan  Palau  Palestine, State of  Panama  Papua New Guinea  Paraguay  Peru  Philippines  Pitcairn  Poland  Portugal  Puerto Rico  Qatar  Romania  Russia  Rwanda  Réunion  Saint Barthélemy  Saint Helena  Saint Kitts and Nevis  Saint Lucia  Saint Martin  Saint Pierre and Miquelon  Saint Vincent and the Grenadines  Samoa  San Marino  Sao Tome and Principe  Saudi Arabia  Senegal  Serbia  Seychelles  Sierra Leone  Singapore  Sint Maarten  Slovakia  Slovenia  Solomon Islands  Somalia  South Africa  South Georgia  South Korea  South Sudan  Spain  Sri Lanka  Sudan  Suriname  Svalbard and Jan Mayen Islands  Sweden  Switzerland  Syria  Taiwan  Tajikistan  Tanzania  Thailand  Timor-Leste  Togo  Tokelau  Tonga  Trinidad and Tobago  Tunisia  Turkey  Turkmenistan  Turks and Caicos Islands  Tuvalu  US Minor Outlying Islands  Uganda  Ukraine  United Arab Emirates  United Kingdom  United States  Uruguay  Uzbekistan  Vanuatu  Venezuela  Vietnam  Virgin Islands, British  Virgin Islands, U.S.  Wallis and Futuna  Western Sahara  Yemen  Zambia  Zimbabwe  Åland Islands
-  Questions / Comments*  *
-  CAPTCHA', 'v1', '2026-08-19 13:12:48', '["US","afghanistan-albania-algeria-american-samoa","andorra-angola-anguilla-antarctica-antigua","barbuda-argentina-armenia-aruba-australia","prose-standard"]', 'Prose Standard', '📝 Medium Chunk', NULL, '[]', '-  Phone
-  Country  *      Country*  Afghanistan  Albania  Algeria  American Samoa  Andorra  Angola  Anguilla  Antarctica  Antigua and Barbuda  Argentina  Armenia  Aruba  Australia  Austria  Azerbaij', 60, 'high', 'web_o8u7CYfuMtZ5', '0651d4e5ebda4f3e17ec7612f3fae1f3c842f7b2809ff48ab15d2226cc37406a', 'text-embedding-3-small', 'ai', 'medium', 'e8915993-0b28-4e8d-812c-3995eb090804_L_60', 'web');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('50172d384d46b90d55bbd20c2f700a7fd00d92f741af00644b0226ae5fccbe41', 'admin', '-  Phone
-  Country  *      Country*  Afghanistan  Albania  Algeria  American Samoa  Andorra  Angola  Anguilla  Antarctica  Antigua and Barbuda  Argentina  Armenia  Aruba  Australia  Austria  Azerbaijan  Bahamas  Bahrain  Bangladesh  Barbados  Belarus  Belgium  Belize  Benin  Bermuda  Bhutan  Bolivia  Bonaire, Sint Eustatius and Saba  Bosnia and Herzegovina  Botswana  Bouvet Island  Brazil  British Indian Ocean Territory  Brunei Darussalam  Bulgaria  Burkina Faso  Burundi  Cambodia  Cameroon  Canada  Cape Verde  Cayman Islands  Central African Republic  Chad  Chile  China  Christmas Island  Cocos Islands  Colombia  Comoros  Congo, Democratic Republic of the  Congo, Republic of the  Cook Islands  Costa Rica  Croatia  Cuba  Curaçao  Cyprus  Czech Republic  Côte d&#039;Ivoire  Denmark  Djibouti  Dominica  Dominican Republic  Ecuador  Egypt  El Salvador  Equatorial Guinea  Eritrea  Estonia  Eswatini (Swaziland)  Ethiopia  Falkland Islands  Faroe Islands  Fiji  Finland  France  French Guiana  French Polynesia  French Southern Territories  Gabon  Gambia  Georgia  Germany  Ghana  Gibraltar  Greece  Greenland  Grenada  Guadeloupe  Guam  Guatemala  Guernsey  Guinea  Guinea-Bissau  Guyana  Haiti  Heard and McDonald Islands  Holy See  Honduras  Hong Kong  Hungary  Iceland  India  Indonesia  Iran  Iraq  Ireland  Isle of Man  Israel  Italy  Jamaica  Japan  Jersey  Jordan  Kazakhstan  Kenya  Kiribati  Kuwait  Kyrgyzstan  Lao People&#039;s Democratic Republic  Latvia  Lebanon  Lesotho  Liberia  Libya  Liechtenstein  Lithuania  Luxembourg  Macau  Macedonia  Madagascar  Malawi  Malaysia  Maldives  Mali  Malta  Marshall Islands  Martinique  Mauritania  Mauritius  Mayotte  Mexico  Micronesia  Moldova  Monaco  Mongolia  Montenegro  Montserrat  Morocco  Mozambique  Myanmar  Namibia  Nauru  Nepal  Netherlands  New Caledonia  New Zealand  Nicaragua  Niger  Nigeria  Niue  Norfolk Island  North Korea  Northern Mariana Islands  Norway  Oman  Pakistan  Palau  Palestine, State of  Panama  Papua New Guinea  Paraguay  Peru  Philippines  Pitcairn  Poland  Portugal  Puerto Rico  Qatar  Romania  Russia  Rwanda  Réunion  Saint Barthélemy  Saint Helena  Saint Kitts and Nevis  Saint Lucia  Saint Martin  Saint Pierre and Miquelon  Saint Vincent and the Grenadines  Samoa  San Marino  Sao Tome and Principe  Saudi Arabia  Senegal  Serbia  Seychelles  Sierra Leone  Singapore  Sint Maarten  Slovakia  Slovenia  Solomon Islands  Somalia  South Africa  South Georgia  South Korea  South Sudan  Spain  Sri Lanka  Sudan  Suriname  Svalbard and Jan Mayen Islands  Sweden  Switzerland  Syria  Taiwan  Tajikistan  Tanzania  Thailand  Timor-Leste  Togo  Tokelau  Tonga  Trinidad and Tobago  Tunisia  Turkey  Turkmenistan  Turks and Caicos Islands  Tuvalu  US Minor Outlying Islands  Uganda  Ukraine  United Arab Emirates  United Kingdom  United States  Uruguay  Uzbekistan  Vanuatu  Venezuela  Vietnam  Virgin Islands, British  Virgin Islands, U.S.  Wallis and Futuna  Western Sahara  Yemen  Zambia  Zimbabwe  Åland Islands
-  Questions / Comments*  *
-  CAPTCHA', 'v1', '2026-08-19 13:12:48', '["phone-country-list","US","afghanistan-albania-algeria-american-samoa","andorra-angola-anguilla-antarctica-antigua","prose-standard"]', 'Prose Standard', '🔍 Phone Country List', NULL, '[]', '-  Phone
-  Country  *      Country*  Afghanistan  Albania  Algeria  American Samoa  Andorra  Angola  Anguilla  Antarctica  Antigua and Barbuda  Argentina  Armenia  Aruba  Australia  Austria  Azerbaij', 61, 'high', 'web_o8u7CYfuMtZ5', '0651d4e5ebda4f3e17ec7612f3fae1f3c842f7b2809ff48ab15d2226cc37406a', 'text-embedding-3-small', 'ai', 'small', 'e8915993-0b28-4e8d-812c-3995eb090804_M_61', 'web');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('e2bc97625a928ba67b35976dc1a496174bcacb554fd4d1d2f2e1179cec4489ed', 'admin', 'By clicking submit, you are agreeing to communication with SEI in accordance with our  Privacy Policy .

-  Comments     This field is for validation purposes and should be left unchanged.', 'v1', '2026-08-19 13:12:48', '["SEI","privacy-policy","comments-this","prose-standard"]', 'Prose Standard', '📝 Medium Chunk', NULL, '[]', 'By clicking submit, you are agreeing to communication with SEI in accordance with our  Privacy Policy ', 62, 'high', 'web_o8u7CYfuMtZ5', '585d5c999ef0d4f7faaeaaeaaeb279ee8723ee2ba2aa28660c059f20c0b07d98', 'text-embedding-3-small', 'ai', 'medium', 'e8915993-0b28-4e8d-812c-3995eb090804_L_60', 'web');
INSERT OR REPLACE INTO chunks ("chunk_id", "source", "content", "version", "created_at", "tags", "topic", "section", "section_number", "section_keywords", "first_sentence", "chunk_index", "priority_level", "file_id", "content_hash", "embedding_model", "chunk_method", "tier", "parent_id", "dataset") VALUES ('4e8e79bec2c97682ca90af7975973291ce4b946ad2d6049d69e8042803513c2a', 'admin', 'By clicking submit, you are agreeing to communication with SEI in accordance with our  Privacy Policy .

-  Comments     This field is for validation purposes and should be left unchanged.', 'v1', '2026-08-19 13:12:48', '["countries-a-z","SEI","privacy-policy","comments-this","prose-standard"]', 'Prose Standard', '🔍 Countries A-Z', NULL, '[]', 'By clicking submit, you are agreeing to communication with SEI in accordance with our  Privacy Policy ', 63, 'high', 'web_o8u7CYfuMtZ5', '585d5c999ef0d4f7faaeaaeaaeb279ee8723ee2ba2aa28660c059f20c0b07d98', 'text-embedding-3-small', 'ai', 'small', 'e8915993-0b28-4e8d-812c-3995eb090804_M_63', 'web');