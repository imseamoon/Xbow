import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ScanEntity } from './scan.entity';

@Entity('scan_audit_logs')
export class ScanAuditEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('uuid')
  scanId!: string;

  @Column({ type: 'varchar' })
  phase!: string;

  @Column({ type: 'int', default: 0 })
  step!: number;

  @Column({ type: 'text' })
  message!: string;

  @Column({ type: 'simple-json', nullable: true })
  data?: Record<string, unknown>;

  /** Duration of this phase in ms */
  @Column({ type: 'int', nullable: true })
  durationMs?: number;

  @CreateDateColumn()
  createdAt!: Date;

  @ManyToOne(() => ScanEntity, (s) => s.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'scanId' })
  scan?: ScanEntity;
}
