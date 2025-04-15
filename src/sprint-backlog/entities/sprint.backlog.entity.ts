import { Incident } from 'src/incidents/entities/incident.entity';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Sprint } from './sprint.entity';

@Entity()
export class SprintBacklog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  assigment_date: Date;

  @ManyToOne(() => Incident, (incident) => incident.sprint_backlog)
  incident: Incident;

  @ManyToOne(() => Sprint, (sprint) => sprint.sprint_backlog)
  sprint: Sprint;
}
