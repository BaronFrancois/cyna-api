import { Module } from "@nestjs/common";
import { PayementController } from "./payement.controller";
import { PayementService } from "./payement.service";
import { PrismaModule } from "src/common/prisma/prisma.module";

@Module({
    imports: [PrismaModule],
    controllers: [PayementController],
    providers: [PayementService],
})
export class PayementModule {}