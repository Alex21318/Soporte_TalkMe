-- =========================================
-- TABLA: NUMEROS_DEMOS
-- Descripción: Almacena los números de WhatsApp disponibles para demos
-- =========================================

CREATE TABLE IF NOT EXISTS NUMEROS_DEMOS (
    ID_NUMERO INT NOT NULL AUTO_INCREMENT,
    NOMBRE_APP VARCHAR(100) NOT NULL COMMENT 'Nombre identificador del demo (ej: DemosTalkme24)',
    NUMERO VARCHAR(20) NOT NULL COMMENT 'Número de WhatsApp (ej: 50378248640)',
    AUTH_CODE VARCHAR(255) NULL COMMENT 'Auth Code de Gupshup',
    APP_ID VARCHAR(100) NULL COMMENT 'App ID de Gupshup',
    AMBIENTE VARCHAR(50) NOT NULL DEFAULT 'DEMO_TALKME' COMMENT 'Ambiente: DEMO_TALKME, DEMO_PARNET, DEMO_IA_TALK',
    ESTADO ENUM('DISPONIBLE', 'OCUPADO', 'INACTIVO') NOT NULL DEFAULT 'DISPONIBLE' COMMENT 'Estado del número',
    ID_EMPRESA INT NULL COMMENT 'ID de la empresa donde está siendo usado (si está OCUPADO)',
    ID_BOT INT NULL COMMENT 'ID del bot donde está siendo usado',
    ID_BOT_REDES INT NULL COMMENT 'ID de bot_redes donde está siendo usado',
    NOMBRE_EMPRESA VARCHAR(100) NULL COMMENT 'Nombre de la empresa para referencia',
    SEGMENTO VARCHAR(10) NULL COMMENT 'Segmento/DB donde está validado: S1, S2, S3, S4, MDD, FS1, FS2, FS3',
    USADO_EL DATETIME NULL COMMENT 'Fecha cuando fue asignado',
    CREADO_EL DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CREADO_POR VARCHAR(50) NOT NULL DEFAULT 'system',
    ACTUALIZADO_EL DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    ACTUALIZADO_POR VARCHAR(50) NULL,
    PRIMARY KEY (ID_NUMERO),
    UNIQUE KEY UK_NUMERO (NUMERO),
    INDEX IDX_ESTADO (ESTADO),
    INDEX IDX_AMBIENTE (AMBIENTE),
    INDEX IDX_OCUPADO (ID_EMPRESA, ID_BOT, ID_BOT_REDES),
    INDEX IDX_SEGMENTO (SEGMENTO)
) ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='Números de WhatsApp disponibles para integraciones de demos';

-- Insertar TODOS los números (96 total) incluyendo los que no tienen AUTH_CODE/APP_ID
-- Algunos tienen campos vacíos que se insertarán como NULL

INSERT INTO NUMEROS_DEMOS (NOMBRE_APP, NUMERO, AUTH_CODE, APP_ID, AMBIENTE, ESTADO, CREADO_POR) VALUES
-- Números DEMO_TALKME (con datos completos)
('DemosTalkme10', '50245272613', 'sk_c1a256f97def480595f418e7e105f70c', '1c33cdcf-5e14-4a82-a545-feea2497002d', 'DEMO_TALKME', 'DISPONIBLE', 'system'),
('DemosTalkme11', '50232213658', 'sk_528e49ca99ad4428a50732023868c8c2', 'f86ed676-4139-4d52-8165-b0712cb4bced', 'DEMO_TALKME', 'DISPONIBLE', 'system'),
('DemosTalkme15', '50245785996', 'sk_4a85c937f02f443ca279812309a18f50', '832dab52-626d-4ffa-ad3e-b4f3d6e13325', 'DEMO_TALKME', 'DISPONIBLE', 'system'),
('DemosTalkme16', '50247927086', 'sk_82ad261387814c789ffe3a81dd2daab5', '550bf4a4-64c0-44dd-8d26-2cae7768b8a8', 'DEMO_TALKME', 'DISPONIBLE', 'system'),
('DemosTalkme18', '573213410411', 'sk_58ec5f6fc99443e5bed74ceb1a19396b', 'b0978385-1f83-4f69-a682-0234b3aabe7a', 'DEMO_TALKME', 'DISPONIBLE', 'system'),
('DemosTalkme19', '50246863587', 'sk_e656f2196f654be7b1702c6648d90b39', '8938def6-e36e-4367-9f92-9c80892ff344', 'DEMO_TALKME', 'DISPONIBLE', 'system'),
('DemosTalkme20', '50238317734', 'sk_e7096e37b5194c13a9cecdddec4edb41', '6e1b9f0a-6e7b-4a50-b34f-fef41c7bce49', 'DEMO_TALKME', 'DISPONIBLE', 'system'),
('DemosTalkme21', '50255580407', 'sk_14c72cb183e2455796c831fb9aae0a35', '3ed4a1ff-e7a2-4261-ad3f-5be3b6360112', 'DEMO_TALKME', 'DISPONIBLE', 'system'),
('DemosTalkme22', '50246230682', 'sk_a2388891ad4b41bc9f19c10819c9da07', '8e977f8a-dada-4cfb-be8d-596a6474ee29', 'DEMO_TALKME', 'DISPONIBLE', 'system'),
('DemosTalkme23', '573166166838', 'sk_3557c4a68fbc4310b72b80db2e7f4b9d', '60319b00-148c-4344-b7e8-3e320bb8b358', 'DEMO_TALKME', 'DISPONIBLE', 'system'),
('DemosTalkme24', '50378248640', 'sk_c1311eeca7f743d2954cf09b5a4b8d6c', '89dfacb9-b50d-43e3-b6d6-f06fc6dab452', 'DEMO_TALKME', 'DISPONIBLE', 'system'),
('DemosTalkme25', '50240321996', 'sk_61e2be51b4da4e3f85541f2f375c227b', '82fbf647-e717-4a32-bfd7-ac274ae18645', 'DEMO_TALKME', 'DISPONIBLE', 'system'),
('DemosTalkme26', '50238876103', 'sk_f7b04f6785df4f44a9eb6f12c7a0b453', 'f798b0ad-19a8-4ce2-a479-92dbbad09db8', 'DEMO_TALKME', 'DISPONIBLE', 'system'),
('DemosTalkme28', '50232257280', 'sk_06ffe40578154f64ae4fe83149f7265c', '4a3a7335-9397-4bff-82e4-16ced1a504ed', 'DEMO_TALKME', 'DISPONIBLE', 'system'),
('DemosTalkme29', '50240058348', 'sk_426f6f1e22f24d378602e8ef63f1a543', '0a3d6d8f-3944-4246-9334-711b3d08ed5e', 'DEMO_TALKME', 'DISPONIBLE', 'system'),
('DemosTalkme30', '50233882232', 'sk_9aab23003cc64f3a83d118134a3f6deb', '569aa190-d8a6-4722-8ae8-2153e30bbe9c', 'DEMO_TALKME', 'DISPONIBLE', 'system'),
('DemosTalkme31', '50238808342', 'sk_46f821b7ea554f18b680b5c9ff465ae0', '252a74f0-39df-475f-9132-fa563821cdbc', 'DEMO_TALKME', 'DISPONIBLE', 'system'),
('DemosTalkme32', '50250348246', 'sk_445720dbeb4b445e87d62e6fb73d2250', '40259681-356c-4438-a66b-f2b694741782', 'DEMO_TALKME', 'DISPONIBLE', 'system'),
('DemosTalkme34', '50251622082', 'sk_ef72b4230be1433193eb88ec5c619093', '27561d96-a7bf-456a-866a-0b4db8410edc', 'DEMO_TALKME', 'DISPONIBLE', 'system'),
('DemosTalkme35', '50371321324', 'sk_ed94c799939c475bbda2ccc1c791bf42', '86a4703f-98d5-4e2f-bd00-3066e5e24977', 'DEMO_TALKME', 'DISPONIBLE', 'system'),
('DemosTalkme36', '5215638003484', 'sk_ead735715a37495596206e09dab831f8', 'ff4d8805-cb54-4e25-94e4-eeaf47af569f', 'DEMO_TALKME', 'DISPONIBLE', 'system'),
('DemosTalkme38', '50378247233', 'sk_f1428e1e88234462aafedefcca34755d', '8b4daa8e-cf94-488f-8b3b-f2734ccdced9', 'DEMO_TALKME', 'DISPONIBLE', 'system'),
('DemosTalkme39', '50361330361', 'sk_fecdd7268d174eb2bc0bdfc281117a2e', '6e8bbcdc-83fb-4705-85c6-4b13b2b9b81f', 'DEMO_TALKME', 'DISPONIBLE', 'system'),
('DemosTalkme4', '50238725180', 'sk_4b983642bb8a40e29a412e7b76da61b4', '475226f5-bd45-4119-873b-b7018676c618', 'DEMO_TALKME', 'DISPONIBLE', 'system'),
('DemosTalkme40', '5215639671181', 'sk_a52fa7de0a4e4de7a9eaba7d974d6791', '8af70888-f075-47c6-8d54-4d3f30a1eaf2', 'DEMO_TALKME', 'DISPONIBLE', 'system'),
('DemosTalkme41', '5215639670400', 'sk_c1311eeca7f743d2954cf09b5a4b8d6c', '89dfacb9-b50d-43e3-b6d6-f06fc6dab452', 'DEMO_TALKME', 'DISPONIBLE', 'system'),
('DemosTalkme43', '50230404845', 'sk_6e7b70f99c8e465dbda5a07b4eb64781', '61c844a9-2c01-4f63-b8a0-0eec32969228', 'DEMO_TALKME', 'DISPONIBLE', 'system'),
('DemosTalkme44', '50230402394', 'sk_520fe59c3bb6427989a04f832492ba63', '279c92ad-84ea-40c8-8050-c6bdf844992a', 'DEMO_TALKME', 'DISPONIBLE', 'system'),
('DemosTalkme45', '50230404530', 'sk_b0fa1793ff244bc1a668f1ac7bddbda0', 'c7970ce3-a18a-4fba-8895-59eceb754b6d', 'DEMO_TALKME', 'DISPONIBLE', 'system'),
('DemosTalkme47', '50660768039', 'sk_76c8f93ba8904c2180e68923ff0250c8', '8878de25-8321-4d87-a1bf-3952dc0dd0b1', 'DEMO_TALKME', 'DISPONIBLE', 'system'),
('DemosTalkme48', '50238471096', 'sk_1298c1a0aff647519f150ee3cd65b362', '1057898c-a3e6-4eac-986d-e34458c96bfa', 'DEMO_TALKME', 'DISPONIBLE', 'system'),
('DemosTalkme49', '50246348200', 'sk_ad9cea4cc88b4dca97508493689040a6', 'e6f4c969-a445-46e5-9cf5-f0ae0ac3e925', 'DEMO_TALKME', 'DISPONIBLE', 'system'),
('DemosTalkme5', '50250569122', 'sk_a944a522da0142479bd11b284a2227b9', 'e2f4776c-fef1-4ccf-8558-af8f4f226c21', 'DEMO_TALKME', 'DISPONIBLE', 'system'),
('DemosTalkme50', '50248691800', 'sk_23bdf38e2a064b21afc5f727d1e7d039', 'df808b77-d596-4042-a40e-97d8223d5d3a', 'DEMO_TALKME', 'DISPONIBLE', 'system'),
('DemosTalkme51', '50250644240', 'sk_7d0c3603a339484d90387cc2b3b339d6', '6289576c-d134-4a63-b2ee-f9048204982e', 'DEMO_TALKME', 'DISPONIBLE', 'system'),
('DemosTalkme53', '50230659896', 'sk_8d7fff4c0a3f470db9a2ca78cacc31d5', 'd3b13ced-5eab-4f76-a294-30d11f171190', 'DEMO_TALKME', 'DISPONIBLE', 'system'),
('DemosTalkme56', '50230659747', 'sk_2662b472ec0f4eeebd664238d72b61da', 'f63360ab-87b0-44da-9790-63a0d524f9dd', 'DEMO_TALKME', 'DISPONIBLE', 'system'),
('DemosTalkme57', '50230659182', 'sk_c15f0fedcf134f49bffcf977a9177351', '53bff74f-754a-4bad-aa9d-33aa6c5ae632', 'DEMO_TALKME', 'DISPONIBLE', 'system'),
('DemosTalkme6', '50249736390', 'sk_670207bc834b4f088393e407e0899fcf', 'b460951f-ac2d-4d8b-bea1-6c4693c20239', 'DEMO_TALKME', 'DISPONIBLE', 'system'),
('DemosTalkme62', '50239142084', 'sk_10bb17252fd74cf19e33f15d113bb12f', '0b586105-64a8-4b44-b23b-a6afde3b4ecb', 'DEMO_TALKME', 'DISPONIBLE', 'system'),
('DemosTalkme66', '50238467706', 'sk_6e1e2a97c13542b290b566b019d99513', '288df853-e957-45f8-ab5b-1bf19799f1bd', 'DEMO_TALKME', 'DISPONIBLE', 'system'),
('DemosTalkme67', '50232532078', 'sk_ff7307475b5245bc95e9754ff9fcfafd', 'e5bb9c85-2ed8-4cfe-a315-7f0bd9fcf431', 'DEMO_TALKME', 'DISPONIBLE', 'system'),
('DemosTalkme69', '50233416108', 'sk_ec05769a5c3f49ddbd1bee0ff32f703e', '50508e59-d650-4acc-974e-01014a5ec6c2', 'DEMO_TALKME', 'DISPONIBLE', 'system'),
('DemosTalkme7', '50249299469', 'sk_b95528641ad94f529588857e3d60d39b', '277f3d50-b2db-4773-97c1-378529c1ddd1', 'DEMO_TALKME', 'DISPONIBLE', 'system'),
('DemosTalkme74', '50255548178', '8fc9605b-088f-4a95-8b91-2c14b59547f0', 'sk_99269e4002ff4aca8d90b0604d0490f8', 'DEMO_TALKME', 'DISPONIBLE', 'system'),
('DemosTalkme75', '50251283203', '5f6d30f3-a0b5-4daa-9531-a2837270214f', 'sk_36e81dcf2af248488509c16813ffcf3e', 'DEMO_TALKME', 'DISPONIBLE', 'system'),
('DemosTalkme76', '50254793435', '8bfab410-b4fc-491c-bb0a-4d8ab49248b0', 'sk_66465e5263a84c00aa290ebb8dda6c5b', 'DEMO_TALKME', 'DISPONIBLE', 'system'),
('DemosTalkme77', '50251289884', '9e3990e7-60a5-42c0-a5b6-963682e134d3', 'sk_c537fbcceb9f4d9994981e74cc41516b', 'DEMO_TALKME', 'DISPONIBLE', 'system'),
('DemosTalkme78', '50251287598', '2ef0b1dd-de11-43be-bf7c-acb1b40ca771', 'sk_4f8285f46ef24c21823f5c79ed5bb64d', 'DEMO_TALKME', 'DISPONIBLE', 'system'),
('DemosTalkme8', '50232903588', 'sk_8544f33277f34024b8852ba04fe7067f', 'd63c71a4-d21e-4e83-8ca6-96c9eb9a384d', 'DEMO_TALKME', 'DISPONIBLE', 'system'),
('DemosTalkme9', '50257326763', 'sk_54c024f2979e4bbd91dcbc02123ba6cb', 'f389f187-4a56-46c5-bfa6-5a2c9f2e6dfa', 'DEMO_TALKME', 'DISPONIBLE', 'system'),
('DemosTalkme81', '50255369779', 'sk_506743099e6a46489190349c826c781e', 'c7f59980-3721-4cc9-a9cf-90f0b9d8e4a3', 'DEMO_TALKME', 'DISPONIBLE', 'system'),

-- Números DEMO_TALKME (con campos vacíos - sin AUTH_CODE/APP_ID)
('DemosTalkme1', '50249013495', NULL, NULL, 'DEMO_TALKME', 'DISPONIBLE', 'system'),
('DemosTalkme12', '50245453226', NULL, NULL, 'DEMO_TALKME', 'DISPONIBLE', 'system'),
('DemosTalkme2', '50246449417', 'a21fabf9-1691-4f5d-98ca-947662cebf83', NULL, 'DEMO_TALKME', 'DISPONIBLE', 'system'),
('DemosTalkme27', '50232673014', NULL, NULL, 'DEMO_TALKME', 'DISPONIBLE', 'system'),
('DemosTalkme3', '50249966158', NULL, NULL, 'DEMO_TALKME', 'DISPONIBLE', 'system'),
('DemosTalkme33', '50231045893', NULL, NULL, 'DEMO_TALKME', 'DISPONIBLE', 'system'),
('DemosTalkme37', '5215620793911', NULL, NULL, 'DEMO_TALKME', 'DISPONIBLE', 'system'),
('DemosTalkme42', '50230404074', NULL, NULL, 'DEMO_TALKME', 'DISPONIBLE', 'system'),
('DemosTalkme46', '50230404629', NULL, NULL, 'DEMO_TALKME', 'DISPONIBLE', 'system'),
('DemosTalkme52', '50253363743', NULL, NULL, 'DEMO_TALKME', 'DISPONIBLE', 'system'),
('DemosTalkme54', '50230658514', NULL, NULL, 'DEMO_TALKME', 'DISPONIBLE', 'system'),
('DemosTalkme55', '50230659465', NULL, NULL, 'DEMO_TALKME', 'DISPONIBLE', 'system'),
('DemosTalkme58', '50245144424', NULL, NULL, 'DEMO_TALKME', 'DISPONIBLE', 'system'),
('DemosTalkme59', '50253302567', NULL, NULL, 'DEMO_TALKME', 'DISPONIBLE', 'system'),
('DemosTalkme61', '50239141913', '8428ac45-2d5a-48b7-a289-626203007338', NULL, 'DEMO_TALKME', 'DISPONIBLE', 'system'),
('DemosTalkme63', '50233193079', NULL, NULL, 'DEMO_TALKME', 'DISPONIBLE', 'system'),
('DemosTalkme64', '50253362493', NULL, NULL, 'DEMO_TALKME', 'DISPONIBLE', 'system'),
('DemosTalkme65', '50239215524', NULL, NULL, 'DEMO_TALKME', 'DISPONIBLE', 'system'),
('Pruebamdl', '50240504618', NULL, NULL, 'DEMO_TALKME', 'DISPONIBLE', 'system'),
('TalkmeSandbox1', '50233837331', NULL, NULL, 'DEMO_TALKME', 'DISPONIBLE', 'system'),
('TalkmeSandbox4', '50374817630', NULL, NULL, 'DEMO_TALKME', 'DISPONIBLE', 'system'),

-- Números DEMO_PARNET (con datos completos)
('IATalk2IngenieriaAvazada', '50242365010', 'sk_10477198a40a43f481e68de0016c5abd', '3c400f83-5973-41ee-b79c-5fa6cff12f11', 'DEMO_PARNET', 'DISPONIBLE', 'system'),
('IATalkIngeneriaAvanzada', '50224124085', 'sk_a5519f486a4947168e307e62d70da292', 'ac43f7bf-16fe-41f1-989f-9a11b67f23fc', 'DEMO_PARNET', 'DISPONIBLE', 'system'),
('IATalkIngeneriaAvanzada2', '50224124086', 'sk_78dcf1fad4594e01b290474a3385fb38', '08beb7ee-4a2d-40a9-86ef-4dc322d14689', 'DEMO_PARNET', 'DISPONIBLE', 'system'),
('IATalkIngeneriaAvanzada3', '50224124087', 'sk_711ab0c3707a4bd69c9cfcdb6ea38895', '4c3f46b7-02be-4776-b022-1e33f9ef800d', 'DEMO_PARNET', 'DISPONIBLE', 'system'),
('IATalkIngeneriaAvanzada5', '50224124089', 'sk_97543797dda84dc78144bef4b7177e23', '31b2b08f-66e1-4764-abaa-6bcdc4a7f4d6', 'DEMO_PARNET', 'DISPONIBLE', 'system'),
('IATalkIngeneriaAvanzada6', '50242993384', 'sk_91bef2fef7db4118a47813ae811c9cce', 'b2b3de4f-a3c0-4ff4-9d24-e7e89e765bb4', 'DEMO_PARNET', 'DISPONIBLE', 'system'),
('IATalkIngeneriaAvanzada4', '50224124088', 'sk_44b1188a2416400e97f64fb4a1f978c7', '7a8011e7-00b8-4920-bec9-07c8c8eb428e', 'DEMO_PARNET', 'DISPONIBLE', 'system'),
('IATalk1IngenieriaAvazada', '50242369213', 'sk_cbba4d4aecc343a69d6829870b3a0b7b', '035c196a-cf0d-44a2-a783-f12956ed021b', 'DEMO_PARNET', 'DISPONIBLE', 'system'),

-- Números DEMO_PARNET (con campos vacíos)
('TalkmeDelimart', '50663257465', NULL, NULL, 'DEMO_PARNET', 'DISPONIBLE', 'system'),
('TalkmeGrupoImade', '50660074322', NULL, NULL, 'DEMO_PARNET', 'DISPONIBLE', 'system'),
('TalkmeMegalabPA', '50764406491', NULL, NULL, 'DEMO_PARNET', 'DISPONIBLE', 'system'),
('TalkmeSaretto', '50670185323', NULL, NULL, 'DEMO_PARNET', 'DISPONIBLE', 'system'),
('TalkmeSbarro', '50663252190', NULL, NULL, 'DEMO_PARNET', 'DISPONIBLE', 'system'),
('TalkmeSelecto', '50660086497', NULL, NULL, 'DEMO_PARNET', 'DISPONIBLE', 'system'),
('TurinkSistemasIntegrados', '50259133323', NULL, NULL, 'DEMO_PARNET', 'DISPONIBLE', 'system'),
('TalkmePeri', '50663252757', NULL, NULL, 'DEMO_PARNET', 'DISPONIBLE', 'system'),

-- Números DEMO_TALKME adicionales
('InfoTalkme', '50222791704', 'sk_362f897cf8da4d5db7a14c99af47d4e9', 'ae7f76a6-f591-41b3-b244-0fdf47679712', 'DEMO_TALKME', 'DISPONIBLE', 'system'),
('PublicidadTalkme', '50238302735', 'sk_a7d2756205054eaf8ed29af80c76218e', 'ef2194f1-51a3-4341-878a-800e7e207cf3', 'DEMO_TALKME', 'DISPONIBLE', 'system'),
('TalkmeFicohsaComercialGT', '50223799074', 'sk_8643887643244a2e8071f381fdf8f8e8', 'c4af00b2-4614-45b0-a21f-a05341cae859', 'DEMO_TALKME', 'DISPONIBLE', 'system'),
('TalkmeSandbox2', '50250319535', 'sk_7d7e411b157341b68b5be58363563ae1', '10d4ac47-50ca-494c-991b-e14760deb45f', 'DEMO_TALKME', 'DISPONIBLE', 'system'),

-- Números DEMO_IA_TALK
('IATalkIngeneriaAvanzada4_IA', '50224124088', 'sk_44b1188a2416400e97f64fb4a1f978c7', '7a8011e7-00b8-4920-bec9-07c8c8eb428e', 'DEMO_IA_TALK', 'DISPONIBLE', 'system'),
('IATalk1IngenieriaAvazada_IA', '50242369213', 'sk_cbba4d4aecc343a69d6829870b3a0b7b', '035c196a-cf0d-44a2-a783-f12956ed021b', 'DEMO_IA_TALK', 'DISPONIBLE', 'system'),
('IATalkIngeneriaAvanzada3_IA', '50224124087', 'sk_711ab0c3707a4bd69c9cfcdb6ea38895', '4c3f46b7-02be-4776-b022-1e33f9ef800d', 'DEMO_IA_TALK', 'DISPONIBLE', 'system')
ON DUPLICATE KEY UPDATE
    AUTH_CODE = VALUES(AUTH_CODE),
    APP_ID = VALUES(APP_ID),
    AMBIENTE = VALUES(AMBIENTE),
    ACTUALIZADO_EL = NOW();

-- =========================================
-- MIGRACIÓN: Agregar columna SEGMENTO (ejecutar si la tabla ya existe)
-- =========================================
ALTER TABLE NUMEROS_DEMOS 
    ADD COLUMN IF NOT EXISTS SEGMENTO VARCHAR(10) NULL 
    COMMENT 'Segmento/DB donde está validado: S1, S2, S3, S4, MDD, FS1, FS2, FS3'
    AFTER NOMBRE_EMPRESA;

ALTER TABLE NUMEROS_DEMOS 
    ADD INDEX IF NOT EXISTS IDX_SEGMENTO (SEGMENTO);
