'use strict';

// Starting directory used to fill an empty directory from the employees page.
const INITIAL_EMPLOYEES = [
  { employee_id: '4780', firstname: 'CHERRY', middle_name: 'BAJAMUNDI', last_name: 'MOSATALLA', position: 'CHIEF', assigned_unit: 'PROVINCIAL HEAD' },
  { employee_id: '4728', firstname: 'RENALYN', middle_name: 'ENRIQUEZ', last_name: 'ALANO', position: 'SENIOR LABOR AND EMPLOYMENT OFFICER', assigned_unit: 'LR/LS' },
  { employee_id: '4745', firstname: 'LORA JOY', middle_name: 'LUNA', last_name: 'BOONGALING', position: 'LABOR AND EMPLOYMENT OFFICER III', assigned_unit: 'EMPLOYMENT' },
  { employee_id: '4766', firstname: 'RICKY', middle_name: 'AZUELA', last_name: 'HERNANDEZ', position: 'LABOR AND EMPLOYMENT OFFICER III', assigned_unit: 'LIVELIHOOD' },
  { employee_id: '15974', firstname: 'CARL CEDRIC', middle_name: 'PAJARIN', last_name: 'ALBUÑAN', position: 'LABOR AND EMPLOYMENT OFFICER II', assigned_unit: 'TUPAD' },
  { employee_id: '14280', firstname: 'ROBERT', middle_name: 'MATALOTE', last_name: 'MAGANA', position: 'ASSISTANT LABOR INSPECTOR', assigned_unit: 'LR/LS' },
  { employee_id: '1302001', firstname: 'MARIA THERESA', middle_name: 'SALEN', last_name: 'RITO', position: 'COMMUNITY FACILITATOR', assigned_unit: 'LIVELIHOOD (CLPEP)' },
  { employee_id: '1301003', firstname: 'LEONNY', middle_name: 'GUINTO', last_name: 'ROMERO', position: 'LIVELIHOOD DEVELOPMENT SPECIALIST', assigned_unit: 'LIVELIHOOD (DILP)' },
  { employee_id: '1305001', firstname: 'JEORSHWIN IVANE', middle_name: 'SALAYON', last_name: 'JO', position: 'JOB ORDER', assigned_unit: 'LIVELIHOOD (DILP)' },
  { employee_id: '1305002', firstname: 'EDMUNDO', middle_name: 'RADA', last_name: 'NIEVA', position: 'JOB ORDER-DRIVER', assigned_unit: 'ASSU' },
  { employee_id: '1303001', firstname: 'AMANDA', middle_name: 'SORIA', last_name: 'ALBAÑO', position: 'PROGRAM COORDINATOR', assigned_unit: 'TUPAD' },
  { employee_id: '1303002', firstname: 'DANICA', middle_name: 'ROMERO', last_name: 'BAÑAGA', position: 'PROGRAM COORDINATOR', assigned_unit: 'LR/LS' },
  { employee_id: '1303012', firstname: 'RICO', middle_name: 'QUIZON', last_name: 'BERJA', position: 'PROGRAM COORDINATOR', assigned_unit: 'TUPAD' },
  { employee_id: '1303005', firstname: 'KIM MATTHEW', middle_name: 'SOLANA', last_name: 'GUTIERREZ', position: 'PROGRAM COORDINATOR', assigned_unit: 'LIVELIHOOD (CLPEP)' },
  { employee_id: '1303004', firstname: 'DARLENE', middle_name: 'BALON', last_name: 'IBIAS', position: 'PROGRAM COORDINATOR', assigned_unit: 'TUPAD' },
  { employee_id: '1303006', firstname: 'ROWENA', middle_name: 'RIGODON', last_name: 'LABRADOR', position: 'PROGRAM COORDINATOR', assigned_unit: 'TUPAD' },
  { employee_id: '1303014', firstname: 'SHYBERLYN', middle_name: 'MONTUYA', last_name: 'LARGO', position: 'PROGRAM COORDINATOR', assigned_unit: 'TUPAD' },
  { employee_id: '1303007', firstname: 'RHODORA', middle_name: 'FERMO', last_name: 'LEVANTINO', position: 'PROGRAM COORDINATOR', assigned_unit: 'TUPAD' },
  { employee_id: '1303009', firstname: 'EMMA', middle_name: 'RAMOREZ', last_name: 'RIVERA', position: 'PROGRAM COORDINATOR', assigned_unit: 'TUPAD' },
  { employee_id: '1303010', firstname: 'REBECCA', middle_name: 'PALACIO', last_name: 'VILLAGEN', position: 'PROGRAM COORDINATOR', assigned_unit: 'EMPLOYMENT' },
  { employee_id: '1503001', firstname: 'ARVIN', middle_name: 'NERI', last_name: 'MABEZA', position: 'PG-JOB ORDER', assigned_unit: 'LR/LS' },
  { employee_id: '1503002', firstname: 'HANNAH CARLOTA', middle_name: 'OJEDA', last_name: 'SEVA', position: 'PG-JOB ORDER', assigned_unit: 'EMPLOYMENT' },
  { employee_id: '1503003', firstname: 'JEFFREY', middle_name: 'FRANCISCO', last_name: 'VALLES', position: 'PG-JOB ORDER', assigned_unit: 'LIVELIHOOD (DILP)' },
  { employee_id: '1503004', firstname: 'JOE MARIE', middle_name: '', last_name: 'SALAMANCA', position: 'PG-JOB ORDER', assigned_unit: 'ASSU' },
];

module.exports = { INITIAL_EMPLOYEES };
