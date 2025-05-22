import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Issue } from '../../issues/entities/issue.entity';

@Entity()
export class IssueMetric {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Issue)
  issue: Issue;

  @Column({ type: 'varchar', length: 50 })
  metricType: string; // time-to-resolution, time-in-progress, etc.

  @Column({ type: 'float' })
  value: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  recordedAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  additionalData: Record<string, any>;
}
