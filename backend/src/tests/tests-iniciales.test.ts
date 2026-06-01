/**
 * tests-iniciales.test.ts
 *
 * Suite de tests unitarios para el flujo de inserción de candidatos.
 *
 * Área 1 — Recepción y validación de datos del formulario (validateCandidateData)
 *   Función pura sin dependencias externas; no requiere mocks.
 *   Verifica que cada regla de negocio se aplica correctamente.
 *
 * Área 2 — Persistencia en base de datos (addCandidate)
 *   Los modelos de dominio (Candidate, Education, WorkExperience, Resume) se mockean
 *   para aislar la lógica del servicio de Prisma/BD real.
 *   Verifica que el servicio orquesta correctamente las llamadas a persistencia.
 */

import { validateCandidateData } from '../application/validator';
import { addCandidate } from '../application/services/candidateService';
import { Candidate } from '../domain/models/Candidate';
import { Education } from '../domain/models/Education';
import { WorkExperience } from '../domain/models/WorkExperience';
import { Resume } from '../domain/models/Resume';

// ── Mocks de modelos de dominio ──────────────────────────────────────────────
// Aislamos Prisma/BD para que los tests sean unitarios y no dependan de
// infraestructura real. Cada modelo queda reemplazado por una clase simulada.
jest.mock('../domain/models/Candidate');
jest.mock('../domain/models/Education');
jest.mock('../domain/models/WorkExperience');
jest.mock('../domain/models/Resume');

const MockCandidate = Candidate as jest.MockedClass<typeof Candidate>;
const MockEducation = Education as jest.MockedClass<typeof Education>;
const MockWorkExperience = WorkExperience as jest.MockedClass<typeof WorkExperience>;
const MockResume = Resume as jest.MockedClass<typeof Resume>;

// ── Fixture base ─────────────────────────────────────────────────────────────
const validCandidateData = {
    firstName: 'Juan',
    lastName: 'Pérez',
    email: 'juan.perez@example.com',
    phone: '612345678',
    address: 'Calle Mayor 1',
};

// ============================================================================
// ÁREA 1: VALIDACIÓN DE DATOS DEL FORMULARIO
// ============================================================================

describe('Área 1: Validación de datos del formulario (validateCandidateData)', () => {

    // ── Casos exitosos ───────────────────────────────────────────────────────

    describe('Casos exitosos', () => {

        it('given_datos_minimos_validos_when_validateCandidateData_then_no_lanza_error', () => {
            /**
             * Verifica que un candidato con todos los campos obligatorios correctos
             * pasa la validación sin error. Es el caso base que garantiza que el
             * validador no rechaza entradas legítimas.
             */
            // Arrange
            const data = { ...validCandidateData };

            // Act & Assert
            expect(() => validateCandidateData(data)).not.toThrow();
        });

        it('given_candidato_con_id_when_validateCandidateData_then_omite_toda_validacion', () => {
            /**
             * En modo edición (id presente) el validador omite todos los campos.
             * Verifica que editar un candidato existente no exige reenviar
             * todos los datos del formulario.
             */
            // Arrange: datos incompletos pero con id → modo edición
            const data = { id: 99 };

            // Act & Assert
            expect(() => validateCandidateData(data)).not.toThrow();
        });

        it('given_candidato_con_educacion_valida_when_validateCandidateData_then_no_lanza_error', () => {
            /**
             * Verifica que la sección de educación con todos sus campos correctos
             * no provoca error, incluyendo fechas en formato YYYY-MM-DD.
             */
            // Arrange
            const data = {
                ...validCandidateData,
                educations: [{
                    institution: 'Universidad Politécnica de Madrid',
                    title: 'Ingeniería Informática',
                    startDate: '2015-09-01',
                    endDate: '2020-06-30',
                }],
            };

            // Act & Assert
            expect(() => validateCandidateData(data)).not.toThrow();
        });

        it('given_candidato_con_experiencia_valida_when_validateCandidateData_then_no_lanza_error', () => {
            /**
             * Verifica que la sección de experiencia laboral con campos válidos
             * (descripción opcional incluida) no provoca error.
             */
            // Arrange
            const data = {
                ...validCandidateData,
                workExperiences: [{
                    company: 'Acme Corp',
                    position: 'Desarrollador Backend',
                    description: 'Desarrollo de APIs REST',
                    startDate: '2020-01-01',
                }],
            };

            // Act & Assert
            expect(() => validateCandidateData(data)).not.toThrow();
        });

        it('given_candidato_con_cv_valido_when_validateCandidateData_then_no_lanza_error', () => {
            /**
             * Verifica que un CV con filePath y fileType presentes pasa la validación.
             * Estos dos campos son los únicos requeridos por el esquema de CV.
             */
            // Arrange
            const data = {
                ...validCandidateData,
                cv: { filePath: '/uploads/cv.pdf', fileType: 'application/pdf' },
            };

            // Act & Assert
            expect(() => validateCandidateData(data)).not.toThrow();
        });
    });

    // ── Errores en campos personales ─────────────────────────────────────────

    describe('Errores en campos personales', () => {

        it('given_firstName_vacio_when_validateCandidateData_then_lanza_Invalid_name', () => {
            /**
             * El nombre no puede estar vacío. Cubre el caso de envío de formulario
             * con campo en blanco.
             */
            // Arrange
            const data = { ...validCandidateData, firstName: '' };

            // Act & Assert
            expect(() => validateCandidateData(data)).toThrow('Invalid name');
        });

        it('given_firstName_de_un_caracter_when_validateCandidateData_then_lanza_Invalid_name', () => {
            /**
             * Longitud mínima del nombre es 2 caracteres. Verifica el límite inferior.
             */
            // Arrange
            const data = { ...validCandidateData, firstName: 'A' };

            // Act & Assert
            expect(() => validateCandidateData(data)).toThrow('Invalid name');
        });

        it('given_firstName_mayor_a_100_caracteres_when_validateCandidateData_then_lanza_Invalid_name', () => {
            /**
             * Longitud máxima es 100 caracteres, alineada con el campo en BD.
             * Verifica el límite superior.
             */
            // Arrange
            const data = { ...validCandidateData, firstName: 'A'.repeat(101) };

            // Act & Assert
            expect(() => validateCandidateData(data)).toThrow('Invalid name');
        });

        it('given_firstName_con_numeros_when_validateCandidateData_then_lanza_Invalid_name', () => {
            /**
             * El nombre solo acepta letras (incluyendo tildes y ñ).
             * Los dígitos deben ser rechazados.
             */
            // Arrange
            const data = { ...validCandidateData, firstName: 'Juan123' };

            // Act & Assert
            expect(() => validateCandidateData(data)).toThrow('Invalid name');
        });

        it('given_email_sin_arroba_when_validateCandidateData_then_lanza_Invalid_email', () => {
            /**
             * Un email sin @ no satisface la regex. Verifica la regla de formato
             * básico de email.
             */
            // Arrange
            const data = { ...validCandidateData, email: 'no-es-un-email' };

            // Act & Assert
            expect(() => validateCandidateData(data)).toThrow('Invalid email');
        });

        it('given_telefono_que_no_comienza_por_6_7_9_when_validateCandidateData_then_lanza_Invalid_phone', () => {
            /**
             * La regex española exige inicio con 6, 7 o 9. Un número que empieza
             * por 5 debe ser rechazado.
             */
            // Arrange
            const data = { ...validCandidateData, phone: '512345678' };

            // Act & Assert
            expect(() => validateCandidateData(data)).toThrow('Invalid phone');
        });

        it('given_telefono_con_menos_de_9_digitos_when_validateCandidateData_then_lanza_Invalid_phone', () => {
            /**
             * La regex requiere exactamente 9 dígitos. Un teléfono corto debe fallar.
             */
            // Arrange
            const data = { ...validCandidateData, phone: '61234' };

            // Act & Assert
            expect(() => validateCandidateData(data)).toThrow('Invalid phone');
        });

        it('given_address_mayor_a_100_caracteres_when_validateCandidateData_then_lanza_Invalid_address', () => {
            /**
             * La dirección tiene un máximo de 100 caracteres. Cubre el límite
             * superior del campo.
             */
            // Arrange
            const data = { ...validCandidateData, address: 'A'.repeat(101) };

            // Act & Assert
            expect(() => validateCandidateData(data)).toThrow('Invalid address');
        });
    });

    // ── Errores en educación ─────────────────────────────────────────────────

    describe('Errores en educación', () => {

        it('given_educacion_sin_institution_when_validateCandidateData_then_lanza_Invalid_institution', () => {
            /**
             * El campo institution es obligatorio en cada entrada de educación.
             */
            // Arrange
            const data = {
                ...validCandidateData,
                educations: [{ institution: '', title: 'Ingeniería', startDate: '2015-09-01' }],
            };

            // Act & Assert
            expect(() => validateCandidateData(data)).toThrow('Invalid institution');
        });

        it('given_educacion_sin_startDate_when_validateCandidateData_then_lanza_Invalid_date', () => {
            /**
             * La fecha de inicio de educación es obligatoria.
             */
            // Arrange
            const data = {
                ...validCandidateData,
                educations: [{ institution: 'UPM', title: 'Ingeniería', startDate: '' }],
            };

            // Act & Assert
            expect(() => validateCandidateData(data)).toThrow('Invalid date');
        });

        it('given_educacion_con_startDate_formato_incorrecto_when_validateCandidateData_then_lanza_Invalid_date', () => {
            /**
             * Las fechas deben tener formato ISO YYYY-MM-DD.
             * Un formato europeo DD/MM/YYYY debe ser rechazado.
             */
            // Arrange
            const data = {
                ...validCandidateData,
                educations: [{ institution: 'UPM', title: 'Ingeniería', startDate: '01/09/2015' }],
            };

            // Act & Assert
            expect(() => validateCandidateData(data)).toThrow('Invalid date');
        });
    });

    // ── Errores en experiencia laboral ───────────────────────────────────────

    describe('Errores en experiencia laboral', () => {

        it('given_experiencia_sin_company_when_validateCandidateData_then_lanza_Invalid_company', () => {
            /**
             * El nombre de la empresa es obligatorio en cada experiencia laboral.
             */
            // Arrange
            const data = {
                ...validCandidateData,
                workExperiences: [{ company: '', position: 'Dev', startDate: '2020-01-01' }],
            };

            // Act & Assert
            expect(() => validateCandidateData(data)).toThrow('Invalid company');
        });

        it('given_experiencia_sin_position_when_validateCandidateData_then_lanza_Invalid_position', () => {
            /**
             * El puesto de trabajo es obligatorio en cada experiencia laboral.
             */
            // Arrange
            const data = {
                ...validCandidateData,
                workExperiences: [{ company: 'Acme', position: '', startDate: '2020-01-01' }],
            };

            // Act & Assert
            expect(() => validateCandidateData(data)).toThrow('Invalid position');
        });

        it('given_description_mayor_a_200_caracteres_when_validateCandidateData_then_lanza_Invalid_description', () => {
            /**
             * La descripción del puesto tiene un máximo de 200 caracteres.
             */
            // Arrange
            const data = {
                ...validCandidateData,
                workExperiences: [{
                    company: 'Acme',
                    position: 'Dev',
                    description: 'A'.repeat(201),
                    startDate: '2020-01-01',
                }],
            };

            // Act & Assert
            expect(() => validateCandidateData(data)).toThrow('Invalid description');
        });
    });

    // ── Errores en CV ────────────────────────────────────────────────────────

    describe('Errores en CV', () => {

        it('given_cv_sin_filePath_when_validateCandidateData_then_lanza_Invalid_CV_data', () => {
            /**
             * El CV debe incluir la ruta del archivo. Sin filePath, el objeto
             * no es procesable por el backend.
             */
            // Arrange
            const data = {
                ...validCandidateData,
                cv: { fileType: 'application/pdf' },
            };

            // Act & Assert
            expect(() => validateCandidateData(data)).toThrow('Invalid CV data');
        });

        it('given_cv_sin_fileType_when_validateCandidateData_then_lanza_Invalid_CV_data', () => {
            /**
             * El CV debe incluir el tipo de archivo para su correcta gestión.
             */
            // Arrange
            const data = {
                ...validCandidateData,
                cv: { filePath: '/uploads/cv.pdf' },
            };

            // Act & Assert
            expect(() => validateCandidateData(data)).toThrow('Invalid CV data');
        });
    });
});

// ============================================================================
// ÁREA 2: PERSISTENCIA EN BASE DE DATOS
// ============================================================================

describe('Área 2: Persistencia en base de datos (addCandidate)', () => {

    let mockCandidateInstance: any;
    let mockEducationInstance: any;
    let mockWorkExperienceInstance: any;
    let mockResumeInstance: any;

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock de la instancia de Candidate: save() devuelve el candidato con id=1
        mockCandidateInstance = {
            save: jest.fn().mockResolvedValue({ id: 1, ...validCandidateData }),
            education: [],
            workExperience: [],
            resumes: [],
        };
        MockCandidate.mockImplementation(() => mockCandidateInstance);

        // Mock de la instancia de Education
        mockEducationInstance = {
            save: jest.fn().mockResolvedValue({ id: 10 }),
            candidateId: undefined,
        };
        MockEducation.mockImplementation(() => mockEducationInstance);

        // Mock de la instancia de WorkExperience
        mockWorkExperienceInstance = {
            save: jest.fn().mockResolvedValue({ id: 20 }),
            candidateId: undefined,
        };
        MockWorkExperience.mockImplementation(() => mockWorkExperienceInstance);

        // Mock de la instancia de Resume
        mockResumeInstance = {
            save: jest.fn().mockResolvedValue({ id: 30 }),
            candidateId: undefined,
        };
        MockResume.mockImplementation(() => mockResumeInstance);
    });

    // ── Casos exitosos ───────────────────────────────────────────────────────

    describe('Casos exitosos', () => {

        it('given_candidato_valido_when_addCandidate_then_instancia_Candidate_y_llama_save', async () => {
            /**
             * Verifica el flujo principal: el servicio crea un Candidate con los
             * datos recibidos, llama a save() exactamente una vez y retorna
             * el objeto persistido (con id asignado por BD).
             */
            // Arrange
            const data = { ...validCandidateData };

            // Act
            const result = await addCandidate(data);

            // Assert
            expect(MockCandidate).toHaveBeenCalledWith(data);
            expect(mockCandidateInstance.save).toHaveBeenCalledTimes(1);
            expect(result).toEqual({ id: 1, ...validCandidateData });
        });

        it('given_candidato_con_educacion_when_addCandidate_then_guarda_educacion_con_candidateId_correcto', async () => {
            /**
             * Verifica que, tras guardar el candidato, se crea una instancia de
             * Education y se asigna el candidateId retornado por BD antes de llamar
             * a save(). Garantiza la integridad referencial de la relación.
             */
            // Arrange
            const education = { institution: 'UPM', title: 'Ingeniería', startDate: '2015-09-01' };
            const data = { ...validCandidateData, educations: [education] };

            // Act
            await addCandidate(data);

            // Assert
            expect(MockEducation).toHaveBeenCalledWith(education);
            expect(mockEducationInstance.candidateId).toBe(1);
            expect(mockEducationInstance.save).toHaveBeenCalledTimes(1);
        });

        it('given_candidato_con_experiencia_when_addCandidate_then_guarda_experiencia_con_candidateId_correcto', async () => {
            /**
             * Verifica que la experiencia laboral se persiste con el candidateId
             * correcto, siguiendo el mismo patrón que la educación.
             */
            // Arrange
            const experience = { company: 'Acme Corp', position: 'Dev Backend', startDate: '2020-01-01' };
            const data = { ...validCandidateData, workExperiences: [experience] };

            // Act
            await addCandidate(data);

            // Assert
            expect(MockWorkExperience).toHaveBeenCalledWith(experience);
            expect(mockWorkExperienceInstance.candidateId).toBe(1);
            expect(mockWorkExperienceInstance.save).toHaveBeenCalledTimes(1);
        });

        it('given_candidato_con_cv_when_addCandidate_then_guarda_resume_con_candidateId_correcto', async () => {
            /**
             * Verifica que el CV se asocia al candidato recién creado mediante
             * el candidateId. Es importante porque el CV se sube en una llamada
             * separada al endpoint /upload.
             */
            // Arrange
            const cv = { filePath: '/uploads/cv.pdf', fileType: 'application/pdf' };
            const data = { ...validCandidateData, cv };

            // Act
            await addCandidate(data);

            // Assert
            expect(MockResume).toHaveBeenCalledWith(cv);
            expect(mockResumeInstance.candidateId).toBe(1);
            expect(mockResumeInstance.save).toHaveBeenCalledTimes(1);
        });
    });

    // ── Casos de error ───────────────────────────────────────────────────────

    describe('Casos de error', () => {

        it('given_datos_invalidos_when_addCandidate_then_lanza_error_de_validacion_antes_de_persistir', async () => {
            /**
             * Si los datos no pasan la validación, el servicio lanza el error
             * antes de intentar cualquier acceso a BD. Garantiza que datos
             * incorrectos nunca llegan a Prisma.
             */
            // Arrange: firstName vacío falla la validación
            const data = { ...validCandidateData, firstName: '' };

            // Act & Assert
            await expect(addCandidate(data)).rejects.toThrow(/Invalid name/);
            expect(mockCandidateInstance.save).not.toHaveBeenCalled();
        });

        it('given_email_duplicado_when_addCandidate_then_lanza_email_ya_existe_en_BD', async () => {
            /**
             * Prisma lanza P2002 cuando viola la constraint unique del email.
             * El servicio debe traducirlo a un mensaje de negocio comprensible,
             * sin exponer detalles internos de BD al cliente.
             */
            // Arrange: simular error P2002 (unique constraint en email)
            const p2002Error = Object.assign(new Error('Unique constraint violated'), { code: 'P2002' });
            mockCandidateInstance.save = jest.fn().mockRejectedValue(p2002Error);

            // Act & Assert
            await expect(addCandidate({ ...validCandidateData }))
                .rejects.toThrow('The email already exists in the database');
        });

        it('given_error_generico_de_BD_when_addCandidate_then_relanza_el_error_original', async () => {
            /**
             * Para errores de BD que no son P2002 (ej. conexión rechazada),
             * el servicio debe propagar el error original sin modificarlo para
             * no ocultar problemas de infraestructura.
             */
            // Arrange: simular error de conexión genérico
            const dbError = new Error('Connection refused');
            mockCandidateInstance.save = jest.fn().mockRejectedValue(dbError);

            // Act & Assert
            await expect(addCandidate({ ...validCandidateData }))
                .rejects.toThrow('Connection refused');
        });
    });
});
