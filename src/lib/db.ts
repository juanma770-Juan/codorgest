import { supabase } from './supabase';

// ========================================
// INTERFACES (se mantienen iguales)
// ========================================

export interface IncubationBatch {
  id: string;
  incubatorName: string;
  capacity: number;
  startDate: string;
  expectedHatchDate: string;
  eggsLoaded: number;
  status: 'active' | 'completed';
  hatchedCount?: number;
  infertileCount?: number;
  discardedCount?: number;
  notes?: string;
  temperatureLogs: { date: string; temp: number; humidity: number; note?: string }[];
  ovoscopiaAlertSent?: boolean;
}

export interface Cage {
  id: string;
  batteryId: number;
  floorId: number;
  spaceId: number;
  purpose: 'postura' | 'engorde' | 'reproductores' | 'libre';
  males: number;
  females: number;
  birthDate?: string;
  notes?: string;
}

export interface EggLog {
  id: string;
  date: string;
  cageId: string;
  goodEggs: number;
  brokenEggs: number;
  incubatorEggs: number;
}

// ========================================
// INCUBACIÓN - Operaciones con Supabase
// ========================================

export async function getIncubationBatches(): Promise<IncubationBatch[]> {
  const { data, error } = await supabase
    .from('incubation_batches')
    .select('*')
    .order('startDate', { ascending: false });

  if (error) {
    console.error('Error cargando lotes:', error);
    return [];
  }
  return data || [];
}

export async function getActiveBatches(): Promise<IncubationBatch[]> {
  const { data, error } = await supabase
    .from('incubation_batches')
    .select('*')
    .eq('status', 'active')
    .order('startDate', { ascending: false });

  if (error) {
    console.error('Error cargando lotes activos:', error);
    return [];
  }
  return data || [];
}

export async function addIncubationBatch(batch: Omit<IncubationBatch, 'id' | 'status'>): Promise<IncubationBatch> {
  const newBatch = {
    id: Date.now().toString(),
    ...batch,
    status: 'active',
    temperatureLogs: batch.temperatureLogs || []
  };

  const { error } = await supabase
    .from('incubation_batches')
    .insert(newBatch);

  if (error) {
    console.error('Error creando lote:', error);
    throw error;
  }
  return newBatch as IncubationBatch;
}

export async function updateIncubationBatch(id: string, updates: Partial<IncubationBatch>): Promise<void> {
  const { error } = await supabase
    .from('incubation_batches')
    .update(updates)
    .eq('id', id);

  if (error) {
    console.error('Error actualizando lote:', error);
  }
}

export async function completeIncubationBatch(id: string, hatchedCount: number, infertileCount: number): Promise<void> {
  return updateIncubationBatch(id, {
    status: 'completed',
    hatchedCount,
    infertileCount
  });
}

export async function deleteIncubationBatch(id: string): Promise<void> {
  const { error } = await supabase
    .from('incubation_batches')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error eliminando lote:', error);
  }
}

// ========================================
// JAULAS - Operaciones con Supabase
// ========================================

async function seedCagesIfEmpty(): Promise<void> {
  const { count, error } = await supabase
    .from('cages')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error('Error verificando jaulas:', error);
    return;
  }

  if (count === 0 || count === null) {
    const seeded: Cage[] = [];
    for (let b = 1; b <= 3; b++) {
      for (let f = 1; f <= 5; f++) {
        for (let s = 1; s <= 2; s++) {
          seeded.push({
            id: `bat${b}-piso${f}-esp${s}`,
            batteryId: b,
            floorId: f,
            spaceId: s,
            purpose: 'libre',
            males: 0,
            females: 0
          });
        }
      }
    }

    const { error: insertError } = await supabase
      .from('cages')
      .insert(seeded);

    if (insertError) {
      console.error('Error sembrando jaulas:', insertError);
    }
  }
}

export async function getCages(): Promise<Cage[]> {
  await seedCagesIfEmpty();

  const { data, error } = await supabase
    .from('cages')
    .select('*')
    .order('batteryId')
    .order('floorId')
    .order('spaceId');

  if (error) {
    console.error('Error cargando jaulas:', error);
    return [];
  }
  return data || [];
}

export async function updateCage(id: string, updates: Partial<Cage>): Promise<void> {
  const { error } = await supabase
    .from('cages')
    .update(updates)
    .eq('id', id);

  if (error) {
    console.error('Error actualizando jaula:', error);
  }
}

// ========================================
// PRODUCCIÓN DE HUEVOS - Operaciones con Supabase
// ========================================

export async function getEggLogsByDate(date: string): Promise<EggLog[]> {
  const { data, error } = await supabase
    .from('egg_logs')
    .select('*')
    .eq('date', date);

  if (error) {
    console.error('Error cargando registros de huevos:', error);
    return [];
  }
  return data || [];
}

export async function saveEggLog(log: Omit<EggLog, 'id'>): Promise<void> {
  const id = `${log.date}_${log.cageId}`;

  const { error } = await supabase
    .from('egg_logs')
    .upsert({ ...log, id }, { onConflict: 'id' });

  if (error) {
    console.error('Error guardando registro de huevos:', error);
  }
}
