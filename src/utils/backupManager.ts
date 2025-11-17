import { supabase } from '@/integrations/supabase/client';

export interface BackupResult {
  success: boolean;
  backupId?: string;
  backupLocation?: string;
  schemaChecksum?: string;
  dataChecksum?: string;
  sizeBytes?: number;
  error?: string;
}

export interface BackupMetadata {
  id: string;
  created_at: string;
  migration_id?: string;
  backup_location: string;
  schema_checksum?: string;
  data_checksum?: string;
  size_bytes?: number;
  can_restore: boolean;
  backup_type: string;
  notes?: string;
}

export class BackupManager {
  async createPreMigrationBackup(migrationId?: string, notes?: string): Promise<BackupResult> {
    try {
      console.log('Creating pre-migration backup...');

      // Call the edge function to create backup
      const { data, error } = await supabase.functions.invoke('export-schema', {
        body: { 
          includeData: true,
          format: 'json'
        }
      });

      if (error) {
        console.error('Error creating backup:', error);
        return {
          success: false,
          error: error.message
        };
      }

      if (!data || !data.schema) {
        return {
          success: false,
          error: 'No schema data returned from backup'
        };
      }

      // Generate checksums
      const schemaChecksum = this.generateChecksum(JSON.stringify(data.schema));
      const dataChecksum = data.data ? this.generateChecksum(JSON.stringify(data.data)) : undefined;

      // Store backup in database
      const backupData = {
        migration_id: migrationId,
        backup_location: `backup_${Date.now()}.json`,
        schema_checksum: schemaChecksum,
        data_checksum: dataChecksum,
        size_bytes: JSON.stringify(data).length,
        can_restore: true,
        backup_type: 'pre_migration',
        notes: notes,
        created_by: (await supabase.auth.getUser()).data.user?.id
      };

      const { data: backupRecord, error: insertError } = await supabase
        .from('migration_backups')
        .insert(backupData)
        .select()
        .single();

      if (insertError) {
        console.error('Error storing backup metadata:', insertError);
        return {
          success: false,
          error: insertError.message
        };
      }

      console.log('Backup created successfully:', backupRecord.id);

      return {
        success: true,
        backupId: backupRecord.id,
        backupLocation: backupRecord.backup_location,
        schemaChecksum: backupRecord.schema_checksum || undefined,
        dataChecksum: backupRecord.data_checksum || undefined,
        sizeBytes: backupRecord.size_bytes || undefined
      };
    } catch (err) {
      console.error('Exception creating backup:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      };
    }
  }

  async getRecentBackup(maxAgeHours: number = 24): Promise<BackupMetadata | null> {
    try {
      const cutoffTime = new Date();
      cutoffTime.setHours(cutoffTime.getHours() - maxAgeHours);

      const { data, error } = await supabase
        .from('migration_backups')
        .select('*')
        .gte('created_at', cutoffTime.toISOString())
        .eq('can_restore', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        return null;
      }

      return data as BackupMetadata;
    } catch (err) {
      console.error('Error fetching recent backup:', err);
      return null;
    }
  }

  async listBackups(limit: number = 10): Promise<BackupMetadata[]> {
    try {
      const { data, error } = await supabase
        .from('migration_backups')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error listing backups:', error);
        return [];
      }

      return (data || []) as BackupMetadata[];
    } catch (err) {
      console.error('Exception listing backups:', err);
      return [];
    }
  }

  async restoreBackup(backupId: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('Restoring backup:', backupId);

      // Get backup metadata
      const { data: backup, error: fetchError } = await supabase
        .from('migration_backups')
        .select('*')
        .eq('id', backupId)
        .single();

      if (fetchError || !backup) {
        return {
          success: false,
          error: 'Backup not found'
        };
      }

      if (!backup.can_restore) {
        return {
          success: false,
          error: 'Backup cannot be restored'
        };
      }

      // Here you would implement the actual restore logic
      // This would typically involve calling an edge function
      // that reads the backup data and restores it to the database

      console.log('Backup restore not yet implemented');

      return {
        success: false,
        error: 'Backup restore not yet implemented'
      };
    } catch (err) {
      console.error('Exception restoring backup:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      };
    }
  }

  private generateChecksum(data: string): string {
    // Simple checksum - in production, use a proper hashing library
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }
}

export const backupManager = new BackupManager();
