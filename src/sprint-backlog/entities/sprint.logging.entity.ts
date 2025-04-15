import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Sprint } from './sprint.entity';
import { Epic } from 'src/incidents/entities/epic.entity';
import { Project } from 'src/projects/entities/project.entity';
import { Incident } from 'src/incidents/entities/incident.entity';

@Entity()
export class SprintLogging {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
    nullable: false,
  })
  user_id: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  logging_date: Date;

  @ManyToOne(() => Sprint, (sprint) => sprint.logging)
  sprint: Sprint;

  @ManyToOne(() => Epic, (epic) => epic.logging)
  epic: Epic;

  @ManyToOne(() => Incident, (incident) => incident.logging)
  incident: Incident;

  @ManyToOne(() => Project, (project) => project.logging)
  project: Project;
}
