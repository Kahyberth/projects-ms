import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Project } from '../../projects/entities/project.entity';

@Entity()
export class ProjectMetric {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Project)
  project: Project;

  @Column({ type: 'varchar', length: 50 })
  metricType: string; // lead-time, cycle-time, throughput, etc.

  @Column({ type: 'float' })
  value: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  recordedAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  additionalData: Record<string, any>;
}
