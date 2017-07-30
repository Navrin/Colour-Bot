import { User } from './user';
import { Colour } from './colour';
import { Entity, PrimaryColumn, OneToMany, ManyToMany, Column, JoinColumn, Index } from 'typeorm';
import 'reflect-metadata';
import { ColourRequest } from './colourRequest';

export
interface GuildSettings {
    [key: string]: any;
    colourDelta: number;
    autoAcceptRequests: boolean;
}

export 
const defaultGuildSettings = {
    colourDelta: 2,
    autoAcceptRequests: false,
};

@Entity()
@Index('guild_id_index', (guild: Guild) => [guild.id])
export class Guild {
    @PrimaryColumn()
    @Index()
    id: string;

    @OneToMany(type => Colour, colour => colour.guild, {
        cascadeInsert: true,
        cascadeUpdate: true,
    })
    colours: Colour[];

    @OneToMany(type => ColourRequest, request => request.guild, {
        cascadeInsert: true,
        cascadeUpdate: true,
    })
    requests: ColourRequest[];

    @ManyToMany(type => User, user => user.guilds, {
        cascadeInsert: true,
        cascadeUpdate: true,
    })
    @JoinColumn()
    users: User[] = [];

    @Column('string', { nullable: true })
    channel?: string;

    @Column('string', { nullable: true })
    listmessage?: string;

    @Column('string', { nullable: true })
    helpmessage?: string;

    @Column('jsonb', { nullable: true })
    settings?: GuildSettings;
}
