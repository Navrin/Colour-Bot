import { User } from './../user/model';
import { Guild } from './../guild/model';
import { 
    Entity, 
    Column, 
    PrimaryGeneratedColumn, 
    ManyToOne, 
    OneToOne, 
    OneToMany, 
    ManyToMany,
    JoinColumn,
    Index, 
} from 'typeorm';
import 'reflect-metadata';

@Entity()
@Index('colour_id_and_name_index', (colour: Colour) => [colour.name, colour.id])
export class Colour {
    @PrimaryGeneratedColumn()
    @Index()
    id: number;

    @Column()
    @Index()
    name: string;

    @Column()
    roleID: string;

    @ManyToMany(type => User, user => user.colours, {
        cascadeInsert: true,
        cascadeUpdate: true,
    })
    @JoinColumn()
    users: User[];

    @ManyToOne(type => Guild, guild => guild.colours)
    guild: Guild;
}
