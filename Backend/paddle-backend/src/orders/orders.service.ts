import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  OrderStatus,
  Prisma,
  ProductStatus,
} from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  private orderStatusMessage(orderId: string, status: OrderStatus): string {
    const shortId = orderId.slice(0, 8);
    switch (status) {
      case OrderStatus.PENDING:
        return `Your order #${shortId} is pending review.`;
      case OrderStatus.CONFIRMED:
        return `Your order #${shortId} has been confirmed.`;
      case OrderStatus.SHIPPED:
        return `Your order #${shortId} has been shipped.`;
      case OrderStatus.DELIVERED:
        return `Your order #${shortId} has been delivered.`;
      case OrderStatus.CANCELLED:
        return `Your order #${shortId} has been cancelled.`;
      default:
        return `Your order #${shortId} status was updated to ${status}.`;
    }
  }

  async create(userId: number, dto: CreateOrderDto) {
    const productIds = dto.items.map((item) => item.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    if (products.length !== productIds.length) {
      throw new BadRequestException('One or more products were not found');
    }

    const ownerIds = [...new Set(products.map((p) => p.paddleOwnerId))];
    if (ownerIds.length > 1) {
      throw new BadRequestException(
        'All products in one order must belong to the same paddle owner',
      );
    }

    const paddleOwnerId = ownerIds[0];
    let totalAmount = new Prisma.Decimal(0);
    const lineItems: {
      productId: string;
      quantity: number;
      price: Prisma.Decimal;
    }[] = [];

    for (const item of dto.items) {
      const product = products.find((p) => p.id === item.productId)!;

      if (product.status !== ProductStatus.ACTIVE) {
        throw new BadRequestException(
          `Product "${product.name}" is not available`,
        );
      }
      if (product.stock < item.quantity) {
        throw new BadRequestException(
          `Not enough stock for "${product.name}"`,
        );
      }

      const lineTotal = new Prisma.Decimal(product.price).mul(item.quantity);
      totalAmount = totalAmount.add(lineTotal);
      lineItems.push({
        productId: product.id,
        quantity: item.quantity,
        price: new Prisma.Decimal(product.price),
      });
    }

    return this.prisma.$transaction(async (tx) => {
      for (const item of lineItems) {
        const updated = await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: { decrement: item.quantity },
          },
        });

        if (updated.stock <= 0) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stock: 0,
              status: ProductStatus.OUT_OF_STOCK,
            },
          });
        }
      }

      return tx.order.create({
        data: {
          userId,
          paddleOwnerId,
          totalAmount,
          shippingAddress: dto.shippingAddress,
          notes: dto.notes,
          items: {
            create: lineItems.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.price,
            })),
          },
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
          paddleOwner: {
            select: {
              id: true,
              organizationName: true,
            },
          },
        },
      });
    });
  }

  findMyOrders(userId: number) {
    return this.prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: { orderBy: { sortOrder: 'asc' }, take: 1 },
              },
            },
          },
        },
        paddleOwner: {
          select: {
            id: true,
            organizationName: true,
          },
        },
      },
    });
  }

  findOwnerOrders(paddleOwnerId: number) {
    return this.prisma.order.findMany({
      where: { paddleOwnerId },
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: { orderBy: { sortOrder: 'asc' }, take: 1 },
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            fullName: true,
            mobileNumber: true,
          },
        },
      },
    });
  }

  async findOneForOwner(orderId: string, paddleOwnerId: number) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: { orderBy: { sortOrder: 'asc' }, take: 1 },
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            fullName: true,
            mobileNumber: true,
          },
        },
      },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (order.paddleOwnerId !== paddleOwnerId) {
      throw new ForbiddenException('You can only view your own store orders');
    }
    return order;
  }

  async updateStatus(
    orderId: string,
    paddleOwnerId: number,
    dto: UpdateOrderStatusDto,
  ) {
    const existing = await this.findOneForOwner(orderId, paddleOwnerId);

    const order = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: dto.status },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: { orderBy: { sortOrder: 'asc' }, take: 1 },
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            fullName: true,
            mobileNumber: true,
          },
        },
      },
    });

    if (existing.status !== dto.status) {
      await this.prisma.notification.create({
        data: {
          receiverId: order.userId,
          senderId: paddleOwnerId,
          type: 'Order Status',
          message: this.orderStatusMessage(order.id, dto.status),
        },
      });
    }

    return order;
  }
}
