import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Sprint } from '../../sprint-backlog/entities/sprint.entity';

@Entity()
export class SprintMetric {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Sprint)
  sprint: Sprint;

  @Column({ type: 'varchar', length: 50 })
  metricType: string; // velocity, burndown, completion-rate, etc.

  @Column({ type: 'float' })
  value: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  recordedAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  additionalData: Record<string, any>;
}
